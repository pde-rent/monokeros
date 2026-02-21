import { Injectable, Logger } from '@nestjs/common';
import type { MemberGender } from '@monokeros/types';

interface RandomUserResponse {
  results: Array<{
    gender: 'male' | 'female';
    name: {
      first: string;
      last: string;
    };
  }>;
}

export interface GeneratedIdentity {
  firstName: string;
  gender: MemberGender;
}

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  /**
   * Generate a random identity (first name + gender) from randomuser.me API.
   * Falls back to deterministic random names if API fails.
   */
  async generateIdentity(): Promise<GeneratedIdentity> {
    try {
      const res = await fetch('https://randomuser.me/api/?nat=us&inc=gender,name');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as RandomUserResponse;
      const result = data.results?.[0];
      if (!result) {
        throw new Error('No results from API');
      }
      return {
        firstName: result.name.first,
        gender: result.gender === 'male' ? 1 : 2,
      };
    } catch (err) {
      this.logger.warn(`Failed to fetch random name: ${err}. Using fallback.`);
      return this.generateFallbackIdentity();
    }
  }

  /**
   * Generate a name for a specific gender from randomuser.me API.
   */
  async generateIdentityForGender(gender: MemberGender): Promise<GeneratedIdentity> {
    try {
      const genderParam = gender === 1 ? 'male' : 'female';
      const res = await fetch(`https://randomuser.me/api/?nat=us&inc=gender,name&gender=${genderParam}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as RandomUserResponse;
      const result = data.results?.[0];
      if (!result) {
        throw new Error('No results from API');
      }
      return {
        firstName: result.name.first,
        gender,
      };
    } catch (err) {
      this.logger.warn(`Failed to fetch random name for gender: ${err}. Using fallback.`);
      return this.generateFallbackIdentity(gender);
    }
  }

  /**
   * Fallback deterministic name generator using a curated list of common names.
   */
  private generateFallbackIdentity(gender?: MemberGender): GeneratedIdentity {
    const maleNames = [
      'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
      'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
      'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
      'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
      'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin',
      'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Raymond', 'Gregory', 'Frank',
      'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose',
      'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle', 'Noah',
    ];
    const femaleNames = [
      'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan',
      'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
      'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol',
      'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura',
      'Cynthia', 'Kathleen', 'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda', 'Pamela',
      'Emma', 'Nicole', 'Helen', 'Samantha', 'Katherine', 'Christine', 'Debra',
      'Rachel', 'Carolyn', 'Janet', 'Catherine', 'Maria', 'Heather', 'Diane',
      'Ruth', 'Julie', 'Olivia', 'Joyce', 'Virginia', 'Victoria', 'Kelly', 'Lauren',
    ];

    // Use crypto for randomness if available, otherwise Math.random
    const randomIndex = <T>(arr: T[]): number => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        const uuid = crypto.randomUUID();
        const hash = parseInt(uuid.replace(/-/g, '').slice(0, 8), 16);
        return hash % arr.length;
      }
      return Math.floor(Math.random() * arr.length);
    };

    const resolvedGender = gender ?? (randomIndex([1, 2] as const) === 0 ? 1 : 2) as MemberGender;
    const names = resolvedGender === 1 ? maleNames : femaleNames;
    const firstName = names[randomIndex(names)];

    return { firstName, gender: resolvedGender };
  }
}
