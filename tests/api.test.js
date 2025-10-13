const request = require('supertest');
const express = require('express');
const userRouter = require('../server/routes/user'); // adapt if you split routes

const app = express();
app.use(express.json());
app.use('/api/users', userRouter);

describe('GET /api/users', () => {
  it('should respond with JSON array', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
