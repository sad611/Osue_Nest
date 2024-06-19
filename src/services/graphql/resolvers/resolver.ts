import { Resolver, Query } from '@nestjs/graphql';
import { User } from '../schemas/schema';
import { GraphqlService } from '../graphql.service';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly graphqlService: GraphqlService) {}

  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.graphqlService.users();
  }
}