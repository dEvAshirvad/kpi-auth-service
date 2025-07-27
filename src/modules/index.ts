import { createRouter } from '@/configs/server.config';
import membersRouter from './members/members.route';

const router = createRouter();

// Register routes
router.use('/members', membersRouter);

export default router;
