import { TABLES } from './constants';
import { databaseRepo } from './db_connection';
import { Customer, Dispute, Transaction } from './types';

(async () => {
    const records = await databaseRepo.getFirst10Recordss(TABLES.TRANSACTIONS);
    // const records = await databaseRepo.getFirst10Records<Transaction>(TABLES.TRANSACTIONS);
    // const records = await databaseRepo.getWhere<Customer>(TABLES.CUSTOMERS, { successful: true });
    console.log(records);
  })();