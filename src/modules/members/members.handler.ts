import { Request, Response } from 'express';
import { MemberService } from './members.service';
import Respond from '@/lib/respond';
import logger from '@/configs/logger';

export class MemberHandler {
  static async getMembers(req: Request, res: Response) {
    const { department, role, page, limit } = req.query;

    const filters = {
      department: department as string,
      role: role as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const result = await MemberService.getMembers(filters);
    Respond(
      res,
      {
        ...result,
        message: 'Members fetched successfully',
      },
      200
    );
  }

  static async getMyMember(req: Request, res: Response) {
    const member = await MemberService.getMemberByUserId(
      req.user?.id as string
    );
    Respond(res, { member, message: 'Member fetched successfully' }, 200);
  }

  static async updateMember(req: Request, res: Response) {
    const { id } = req.params;
    const {
      name,
      email,
      department: departmentSlug,
      role,
      metadata,
    } = req.body;
    const member = await MemberService.updateMember(id, {
      userId: id,
      name,
      email,
      departmentSlug,
      role,
      metadata,
    });
    Respond(res, { member, message: 'Member updated successfully' }, 200);
  }
}
