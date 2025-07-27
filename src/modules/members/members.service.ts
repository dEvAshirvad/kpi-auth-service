import { MemberCreate, MemberModel } from './members.model';
import { db } from '@/configs/db/mongodb';
import { ObjectId } from 'mongodb';
import logger from '@/configs/logger';

export class MemberService {
  static async createMember(member: MemberCreate) {
    const newMember = await MemberModel.create(member);
    return newMember;
  }

  static async getMemberByUserId(id: string) {
    const member = await MemberModel.findOne({ userId: id }).lean();
    const user = await db.collection('user').findOne({ _id: new ObjectId(id) });

    return {
      ...member,
      user,
    };
  }

  static async updateMember(
    id: string,
    member: Partial<MemberCreate> & {
      name?: string;
      email?: string;
    }
  ) {
    const user = await db.collection('user').findOne({ _id: new ObjectId(id) });
    if (!user) {
      throw new Error('User not found');
    }

    // Only update user fields if they are provided and not empty
    const userUpdate: any = {};
    if (member.name !== undefined && member.name !== '')
      userUpdate.name = member.name;
    if (member.email !== undefined && member.email !== '')
      userUpdate.email = member.email;

    let updatedUser = null;
    if (Object.keys(userUpdate).length > 0) {
      updatedUser = await db
        .collection('user')
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: userUpdate },
          { returnDocument: 'after' }
        );
    }

    // Only update member fields if they are provided and not empty
    const memberUpdate: any = {};
    if (member.departmentSlug !== undefined && member.departmentSlug !== '')
      memberUpdate.departmentSlug = member.departmentSlug;
    if (member.role !== undefined && member.role !== '')
      memberUpdate.role = member.role;
    if (member.metadata !== undefined) memberUpdate.metadata = member.metadata;

    const updatedMember = await MemberModel.findOneAndUpdate(
      { userId: id },
      { $set: memberUpdate },
      { returnDocument: 'after' }
    ).lean();

    logger.debug(`Updated user: ${JSON.stringify(updatedUser)}`);
    logger.debug(`Updated member: ${JSON.stringify(updatedMember)}`);

    return { member: updatedMember, user: updatedUser };
  }

  static async deleteMember(id: string) {
    const deletedMember = await MemberModel.findByIdAndDelete(id);
    return deletedMember;
  }

  static async getMembers(
    filters: {
      department?: string;
      role?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { department, role, page = 1, limit = 10 } = filters;

    // Build query
    const query: any = {};
    if (department) query.departmentSlug = department;
    if (role) query.role = role;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get members with pagination
    const [members, total] = await Promise.all([
      MemberModel.find(query).skip(skip).limit(limit).lean(),
      MemberModel.countDocuments(query),
    ]);

    // Get user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        try {
          const user = await db.collection('user').findOne({
            _id: new ObjectId(member.userId),
          });
          return {
            ...member,
            user,
          };
        } catch (error) {
          logger.warn(
            `Failed to fetch user for member ${member.userId}:`,
            error
          );
          return {
            ...member,
            user: null,
          };
        }
      })
    );

    return {
      docs: membersWithUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }
}
