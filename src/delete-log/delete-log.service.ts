import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { DeleteLog } from './delete-log.entity';

export type DeleteLogInput = {
  entityType: string;
  action: string;
  entityId: string | null;
  entityName: string | null;
  parentName: string | null;
  deletedById: string | null;
  deletedByName: string | null;
  deletedByEmail: string | null;
  deletedByRole: string | null;
};

export type DeleteLogQuery = {
  type?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

export type DeleteLogView = DeleteLog & {
  deletedByCurrentName: string | null;
  deletedByCurrentEmail: string | null;
};

const MAX_TEXT_LENGTH = 500;
/** From/To filters are picked as Indian calendar days. */
const IST_OFFSET = '+05:30';

@Injectable()
export class DeleteLogService {
  private readonly logger = new Logger(DeleteLogService.name);

  constructor(
    @InjectRepository(DeleteLog)
    private readonly deleteLogRepository: Repository<DeleteLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Never throws: a logging failure must not fail the delete itself. */
  async record(input: DeleteLogInput): Promise<void> {
    try {
      await this.deleteLogRepository.insert({
        ...input,
        entityName: input.entityName?.slice(0, MAX_TEXT_LENGTH) ?? null,
        parentName: input.parentName?.slice(0, MAX_TEXT_LENGTH) ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Could not write delete log for ${input.entityType} ${input.entityId ?? ''}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findAll(query: DeleteLogQuery): Promise<{
    items: DeleteLogView[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number.parseInt(query.page ?? '', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(query.limit ?? '', 10) || 25),
    );

    const qb = this.deleteLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const type = query.type?.trim();
    if (type) {
      qb.andWhere('log.entityType = :type', { type });
    }

    const search = query.search?.trim();
    if (search) {
      const matchingUsers = await this.userRepository.find({
        where: [{ name: Like(`%${search}%`) }, { email: Like(`%${search}%`) }],
        select: { id: true },
        take: 200,
      });
      const matchingUserIds = matchingUsers.map((user) => user.id);
      const userClause = matchingUserIds.length
        ? ' OR log.deletedById IN (:...matchingUserIds)'
        : '';
      qb.andWhere(
        `(log.entityName LIKE :search OR log.parentName LIKE :search OR log.deletedByName LIKE :search OR log.deletedByEmail LIKE :search${userClause})`,
        { search: `%${search}%`, matchingUserIds },
      );
    }

    const from = this.parseDate(query.from);
    if (from) {
      qb.andWhere(
        `log.createdAt >= CONVERT_TZ(:from, '${IST_OFFSET}', @@session.time_zone)`,
        { from: `${from} 00:00:00` },
      );
    }

    const to = this.parseDate(query.to);
    if (to) {
      qb.andWhere(
        `log.createdAt < DATE_ADD(CONVERT_TZ(:to, '${IST_OFFSET}', @@session.time_zone), INTERVAL 1 DAY)`,
        { to: `${to} 00:00:00` },
      );
    }

    const [logs, total] = await qb.getManyAndCount();
    const withExactTimes = await this.withExactCreatedAt(logs);
    const items = await this.withCurrentUserNames(withExactTimes);
    return { items, total, page, limit };
  }

  /**
   * DATETIME has no timezone; the driver reads it in the Node process timezone,
   * which differs between servers and local machines. UNIX_TIMESTAMP uses the
   * same DB session timezone that wrote the value, so the instant is exact.
   */
  private async withExactCreatedAt(logs: DeleteLog[]): Promise<DeleteLog[]> {
    if (logs.length === 0) return logs;
    try {
      const rows: Array<{ id: string; ts: string | number | null }> =
        await this.deleteLogRepository.query(
          'SELECT id, UNIX_TIMESTAMP(created_at) AS ts FROM delete_logs WHERE id IN (?)',
          [logs.map((log) => log.id)],
        );
      const epochById = new Map(rows.map((row) => [row.id, Number(row.ts)]));
      return logs.map((log) => {
        const epoch = epochById.get(log.id);
        return epoch && Number.isFinite(epoch)
          ? { ...log, createdAt: new Date(epoch * 1000) }
          : log;
      });
    } catch (error) {
      this.logger.warn(
        `Could not read exact delete log times: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return logs;
    }
  }

  /** Shows the user's current name/email so renaming an account updates old logs too. */
  private async withCurrentUserNames(
    logs: DeleteLog[],
  ): Promise<DeleteLogView[]> {
    const userIds = [
      ...new Set(
        logs.map((log) => log.deletedById).filter((id): id is string => !!id),
      ),
    ];
    const users = userIds.length
      ? await this.userRepository.find({
          where: { id: In(userIds) },
          select: { id: true, name: true, email: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    return logs.map((log) => {
      const user = log.deletedById ? usersById.get(log.deletedById) : undefined;
      return {
        ...log,
        deletedByCurrentName: user?.name ?? null,
        deletedByCurrentEmail: user?.email ?? null,
      };
    });
  }

  /** Returns a safe `YYYY-MM-DD` string or null. */
  private parseDate(value?: string): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : value;
  }
}
