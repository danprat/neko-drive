const request = require("supertest");
const app = require("../index");

// Mock Storage to avoid actual SQL/Network calls
jest.mock("../services/storage", () => ({
    storage: {
        init: jest.fn().mockResolvedValue(true),
        list: jest.fn().mockResolvedValue([
            { id: "1", name: "test.png", type: "image/png", size: 1024, date: new Date().toISOString() }
        ]),
        get: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
    },
    DB_TYPE: "mock"
}));

describe("Neko Drive API", () => {
    test("GET / should return server status", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("online");
    });

    test("GET /status should return online and storage type", async () => {
        const res = await request(app).get("/status");
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("online");
        expect(res.body.storage).toBeDefined();
    });

    test("GET /files should return a list of files", async () => {
        const res = await request(app).get("/files");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
