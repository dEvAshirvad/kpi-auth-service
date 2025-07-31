import { betterAuth, BetterAuthOptions } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { db } from '@/configs/db/mongodb';
import { admin, openAPI } from 'better-auth/plugins';
import { MemberService } from '@/modules/members/members.service';
import { createAuthMiddleware, APIError } from 'better-auth/api';

const betterAuthConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith('/admin/create-user')) {
        const session = await auth.api.getSession({
          headers: ctx.headers as Headers,
        });
        // @ts-ignore
        if (session?.user?.role !== 'admin') {
          throw new APIError('UNAUTHORIZED', {
            message: 'Unauthorized to create user because you are not an admin',
          });
        }
        const member = await MemberService.getMemberByUserId(session.user.id);
        if (
          !(
            member?.departmentSlug === 'collector-office' ||
            member?.role?.startsWith('nodalOfficer')
          )
        ) {
          throw new APIError('UNAUTHORIZED', {
            message:
              'Unauthorized Member should be from collector-office or nodalOfficer',
          });
        }
        if (!(member?.departmentSlug === 'collector-office')) {
          if (
            !(
              member?.role?.startsWith('nodalOfficer') &&
              member.departmentSlug === ctx.body.data.department
            )
          ) {
            throw new APIError('UNAUTHORIZED', {
              message:
                'Unauthorized Member should be from nodalOfficer and should be from the same department',
            });
          }

          if (
            !(
              member?.role?.startsWith('nodalOfficer') &&
              member.role.split('-')[1] === ctx.body.data.role
            )
          ) {
            throw new APIError('UNAUTHORIZED', {
              message:
                'Unauthorized Member should be from nodalOfficer and assigned to the same role',
            });
          }
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith('/admin/create-user')) {
        const body = ctx.body;
        const returned = ctx.context.returned as any;

        // Add null checks to prevent the error
        if (returned?.user?.id && body?.data?.department && body?.data?.role) {
          await MemberService.createMember({
            userId: returned.user.id,
            departmentSlug: body.data.department,
            role: body.data.role,
            metadata: {
              ...body.data.metadata,
            },
          });
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          return {
            data: {
              ...user,
              role:
                // @ts-ignore
                user?.role === 'admin' || user?.role.startsWith('nodalOfficer')
                  ? 'admin'
                  : 'user',
            },
          };
        },
      },
    },
  },
  database: mongodbAdapter(db),
  plugins: [openAPI(), admin()],
  advanced: {
    cookiePrefix: 'kpi-central',
  },
  trustedOrigins: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3030',
    'http://localhost:3031',
    'http://localhost:3032',
    'http://localhost:3033',
    'http://localhost:3034',
    'http://localhost:3035',
    'http://localhost:3036',
    'http://localhost:3037',
    'http://localhost:3038',
    'http://localhost:3039',
    'http://69.62.77.63:3030',
    'http://69.62.77.63:3031',
    'http://69.62.77.63:3032',
    'http://69.62.77.63:3033',
    'http://69.62.77.63:3034',
    'http://69.62.77.63:3035',
    'http://69.62.77.63:3036',
    'http://69.62.77.63:3037',
    'http://69.62.77.63:3038',
    'http://69.62.77.63:3039',
    'https://kpiservice.rdmp.in',
    'https://auth.rdmp.in',
    'https://shresth.rdmp.in',
    'https://rahat.rdmp.in',
    'https://filesapi.rdmp.in',
  ],
};

export const auth = betterAuth(betterAuthConfig);
