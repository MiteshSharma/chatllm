/**
 * Generic Repository Interface
 * Provides base operations for entity persistence
 */
export interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  create(entity: Partial<T>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
} 
