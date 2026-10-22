import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

const MAX_TEXT_LENGTH = 500;

@Injectable()
export class DeleteLogService {
  private readonly logger = new Logger(DeleteLogService.name);

  constructor(
    @InjectRepository(DeleteLog)
    private readonly deleteLogRepository: Repository<DeleteLog>,
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
    items: DeleteLog[];
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
      qb.andWhere(
        '(log.entityName LIKE :search OR log.parentName LIKE :search OR log.deletedByName LIKE :search OR log.deletedByEmail LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const from = this.parseDate(query.from);
    if (from) {
      qb.andWhere('log.createdAt >= :from', { from });
    }

    const to = this.parseDate(query.to);
    if (to) {
      to.setDate(to.getDate() + 1);
      qb.andWhere('log.createdAt < :to', { to });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  private parseDate(value?: string): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
