import express from 'express';
import membersRouter from './members/members.route';

const router = express.Router();

// Register routes
router.use('/members', membersRouter);

export default router;
