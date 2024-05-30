
import { Injectable } from '@nestjs/common';
import { User } from './schemas/schema';

@Injectable()
export class GraphqlService {
  async users(): Promise<User[]> {
    // Fetch users from the database or another data source
    return [];
  }
}