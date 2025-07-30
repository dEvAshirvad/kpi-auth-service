import express from 'express';
import membersRouter from './members/members.route';
import departmentsRouter from './departments/departments.route';

const router = express.Router();

// Register routes
router.use('/members', membersRouter);
router.use('/departments', departmentsRouter);

export default router;
