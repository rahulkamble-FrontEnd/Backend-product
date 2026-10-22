import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { from, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import type { AuthUser } from '../auth/types/auth-user.type';
import { DeleteLogService } from './delete-log.service';

type Snapshot = {
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  parentName: string | null;
};

type Params = Record<string, string | undefined>;

type DeleteRule = {
  action: 'delete' | 'deactivate' | 'unlink';
  snapshot: (params: Params, db: DataSource) => Promise<Snapshot>;
};

type NameRow = { name: string | null };

type LoggableRequest = {
  method?: string;
  params?: Params;
  route?: { path?: string };
  user?: AuthUser;
};

async function firstName(
  db: DataSource,
  sql: string,
  id: string | undefined,
): Promise<string | null> {
  if (!id) return null;
  const rows: NameRow[] = await db.query(sql, [id]);
  return rows[0]?.name ?? null;
}

const productName = (db: DataSource, id?: string) =>
  firstName(db, 'SELECT name FROM products WHERE id = ? LIMIT 1', id);

const categoryName = (db: DataSource, id?: string) =>
  firstName(db, 'SELECT name FROM categories WHERE id = ? LIMIT 1', id);

function simpleRule(
  entityType: string,
  action: DeleteRule['action'],
  table: string,
  nameColumn: string,
): DeleteRule {
  return {
    action,
    snapshot: async (params, db) => ({
      entityType,
      entityId: params.id ?? null,
      entityName: await firstName(
        db,
        `SELECT ${nameColumn} AS name FROM ${table} WHERE id = ? LIMIT 1`,
        params.id,
      ),
      parentName: null,
    }),
  };
}

/** Keys are route paths without the global `/api` prefix. Unlisted routes (e.g. wishlist, shortlist) are not logged. */
const DELETE_RULES: Record<string, DeleteRule> = {
  '/products/:id': {
    action: 'delete',
    snapshot: async (params, db) => ({
      entityType: 'product',
      entityId: params.id ?? null,
      entityName: await productName(db, params.id),
      parentName: null,
    }),
  },
  '/products/:id/images/:imgId': {
    action: 'delete',
    snapshot: async (params, db) => ({
      entityType: 'product_image',
      entityId: params.imgId ?? null,
      entityName: await firstName(
        db,
        'SELECT s3_key AS name FROM product_images WHERE id = ? LIMIT 1',
        params.imgId,
      ),
      parentName: await productName(db, params.id),
    }),
  },
  '/products/:id/categories/:catId': {
    action: 'unlink',
    snapshot: async (params, db) => ({
      entityType: 'product_category_link',
      entityId: params.catId ?? null,
      entityName: await categoryName(db, params.catId),
      parentName: await productName(db, params.id),
    }),
  },
  '/products/:id/subcategories/:subCategoryId': {
    action: 'unlink',
    snapshot: async (params, db) => ({
      entityType: 'product_subcategory_link',
      entityId: params.subCategoryId ?? null,
      entityName: await categoryName(db, params.subCategoryId),
      parentName: await productName(db, params.id),
    }),
  },
  '/products/:id/tags/:tagId': {
    action: 'unlink',
    snapshot: async (params, db) => ({
      entityType: 'product_tag_link',
      entityId: params.tagId ?? null,
      entityName: await firstName(
        db,
        'SELECT name FROM tags WHERE id = ? LIMIT 1',
        params.tagId,
      ),
      parentName: await productName(db, params.id),
    }),
  },
  '/categories/:id': {
    action: 'deactivate',
    snapshot: async (params, db) => {
      const rows: Array<{ name: string | null; parentName: string | null }> =
        params.id
          ? await db.query(
              `SELECT c.name AS name, p.name AS parentName
               FROM categories c
               LEFT JOIN categories p ON p.id = c.parent_id
               WHERE c.id = ? LIMIT 1`,
              [params.id],
            )
          : [];
      const row = rows[0];
      return {
        entityType: row?.parentName ? 'subcategory' : 'category',
        entityId: params.id ?? null,
        entityName: row?.name ?? null,
        parentName: row?.parentName ?? null,
      };
    },
  },
  '/categories/:categoryId/subcategories/:subCategoryId': {
    action: 'deactivate',
    snapshot: async (params, db) => ({
      entityType: 'subcategory',
      entityId: params.subCategoryId ?? null,
      entityName: await categoryName(db, params.subCategoryId),
      parentName: await categoryName(db, params.categoryId),
    }),
  },
  '/tags/:id': simpleRule('tag', 'delete', 'tags', 'name'),
  '/blog/:id': simpleRule('blog_post', 'delete', 'blog_posts', 'title'),
  '/portfolio/:id': simpleRule('portfolio', 'delete', 'portfolio', 'title'),
  '/trending/:id': simpleRule('trending', 'delete', 'trending', 'title'),
  '/design-cf/:id': simpleRule('design_cf', 'delete', 'design_cf', 'title'),
  '/users/:id': {
    action: 'deactivate',
    snapshot: async (params, db) => ({
      entityType: 'user',
      entityId: params.id ?? null,
      entityName: await firstName(
        db,
        "SELECT CONCAT(name, ' (', email, ')') AS name FROM users WHERE id = ? LIMIT 1",
        params.id,
      ),
      parentName: null,
    }),
  },
};

@Injectable()
export class DeleteLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DeleteLogInterceptor.name);

  constructor(
    private readonly deleteLogService: DeleteLogService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<LoggableRequest>();
    if ((req.method ?? '').toUpperCase() !== 'DELETE' || !req.user) {
      return next.handle();
    }

    const routePath = (req.route?.path ?? '').replace(/^\/api(?=\/)/, '');
    const rule = DELETE_RULES[routePath];
    if (!rule) {
      return next.handle();
    }

    const params = req.params ?? {};
    const user = req.user;

    return from(this.takeSnapshot(rule, params, routePath)).pipe(
      switchMap((snapshot) =>
        next.handle().pipe(
          tap(() => {
            void this.deleteLogService.record({
              ...snapshot,
              action: rule.action,
              deletedById: user.id ?? null,
              deletedByName: user.name ?? null,
              deletedByEmail: user.email ?? null,
              deletedByRole: user.role ?? null,
            });
          }),
        ),
      ),
    );
  }

  /** Read names before the delete runs, since hard deletes remove the row. */
  private async takeSnapshot(
    rule: DeleteRule,
    params: Params,
    routePath: string,
  ): Promise<Snapshot> {
    try {
      return await rule.snapshot(params, this.dataSource);
    } catch (error) {
      this.logger.warn(
        `Delete log lookup failed for ${routePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      const noRowsDb = { query: () => Promise.resolve([]) } as unknown;
      return rule.snapshot(params, noRowsDb as DataSource);
    }
  }
}
