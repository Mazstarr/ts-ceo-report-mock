require('dotenv').config();
// dbRepo.ts
import knex from 'knex';
import { TABLES } from './constants';
import { Q } from '@faker-js/faker/dist/airline-WjISwexU';

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.REDSHIFT_HOST,
        port: Number(process.env.REDSHIFT_PORT) || 5439,
        user: process.env.REDSHIFT_USER,
        password: process.env.REDSHIFT_PASSWORD,
        database: process.env.REDSHIFT_DATABASE,
    },
});

export const databaseRepo = {

    async getFirst10Recordss(tableName: string) {
        return await db(tableName).select('*').limit(10);
    },
    /**
     * Get the first 10 records from any table.
     * @param tableName Name of the table to query
     */
    async getFirst10Records<T>(tableName: string): Promise<T[]> {
        return await db<T>(tableName).select('*').limit(10) as T[];
    },

    /**
     * Get all records from any table.
     * @param tableName Name of the table to query
     */
    async getAll<T>(tableName: string): Promise<T[]> {
        return await db<T>(tableName).select('*') as T[];
    },

    /**
     * Get a record by its ID from any table.
     * @param tableName Name of the table
     * @param idColumn Column name of the ID (primary key)
     * @param id ID value to look for
     */
    async get<T>(tableName: string, idColumn: keyof T, id: T[keyof T]): Promise<T | undefined> {
        return await db<T>(tableName)
            .where(idColumn as string, id as string)
            .first() as T | undefined;
    },

    /**
     * Get records matching a specific condition from any table.
     * @param tableName Name of the table
     * @param condition Condition as an object (e.g., `{ columnName: value }`)
     */
    async getWhere<T>(
        tableName: string,
        condition: Partial<T>,
        distinctColumn?: keyof T,
        orderByColumn?: keyof T,
        excludeCondition?: Partial<T>,  
        rawQuery?: string,  
        rawQueryParams?: any[]  
    ): Promise<T[]> {
        let query;
    
        query = db<T>(tableName);
    
        if (condition) {
            query = query.where(condition);
        }
    
        if (excludeCondition) {
            query = query.whereNot(excludeCondition);
        }
    
        if (rawQuery) {
            query = query.andWhereRaw(rawQuery, rawQueryParams); 
        }
    

        if (distinctColumn && tableName !== TABLES.CUSTOMERS) {
            query = query.distinct(distinctColumn as string);
        }
    
       
        if (orderByColumn) {
            query = query.orderBy(orderByColumn as string, 'asc');
        }
        console.log('Executing SQL query:', query.toString());

        return await query as T[];
    },
    
    async getCount<T>(
        tableName: string,
        condition?: Partial<T>,
        excludeCondition?: Partial<T>
    ): Promise<number> {
        let query;
    
        query = db<T>(tableName);
    
        if (condition) {
            query = query.where(condition);
        }
    

        if (excludeCondition) {
            query = query.whereNot(excludeCondition);
        }

        query = query.count('* as count');
    
        const result = await query;
    
        return result[0].count;
    },
    

    /**
     * Get specific columns from a table with optional conditions.
     * @param tableName Name of the table
     * @param columns Array of column names to retrieve
     * @param condition Optional condition object (e.g., `{ columnName: value }`)
     */
    async getColumns<T>(tableName: string, columns: (keyof T)[], condition: Partial<T> = {}): Promise<Partial<T>[]> {
        return await db<T>(tableName).select(...(columns as string[])).where(condition) as Partial<T>[];
    },

    async executeRawQuery<T>(rawQuery: string, rawQueryParams?: any[]): Promise<T[]> {
        try {
            // console.log('Executing raw SQL query:', rawQuery);  
            const results = await db.raw(rawQuery, rawQueryParams);  
            return results.rows as T[];  
        } catch (error) {
            console.error('Error executing raw SQL query:', error);  
            throw new Error('Failed to execute raw SQL query');
        }
    },
    

    /**
     * Get records with pagination from any table.
     * @param tableName Name of the table
     * @param limit Number of records to retrieve
     * @param offset Number of records to skip
     */
    async getWithPagination<T>(tableName: string, limit: number, offset: number): Promise<T[]> {
        return await db<T>(tableName).select('*').limit(limit).offset(offset) as T[];
    },

    /**
     * Close the database connection (useful for cleanup)
     */
    async closeConnection() {
        await db.destroy();
    }
};
