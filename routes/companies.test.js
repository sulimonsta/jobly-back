"use strict";

const request = require("supertest");

const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("works: as admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("unauth:  anon", async function () {
    const resp = await request(app).post("/companies").send(newCompany);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
  });

  test("unauth: user not admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("works: filtering", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: 3 });
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("works: multi-filter", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: 2, maxEmployees: 3, nameLike: "3" });
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("fails: minEmployees non-int input", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: "non-number" });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: {
        message: ["instance.minEmployees is not of a type(s) integer"],
        status: 400,
      },
    });
  });

  test("fails: maxEmployees non-int input", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ maxEmployees: "non-number" });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: {
        message: ["instance.maxEmployees is not of a type(s) integer"],
        status: 400,
      },
    });
  });

  test("fails: maxEmployees non-int input", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ maxEmployees: "test2" });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: {
        message: ["instance.maxEmployees is not of a type(s) integer"],
        status: 400,
      },
    });
  });

  test("fails: minEmployees larger than maxEmployee", async function () {
    const resp = await request(app)
      .get("/companies")
      .query({ minEmployees: 100, maxEmployees: 5 });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: {
        message: "Maximum Employees must be greater than minimum employees",
        status: 400,
      },
    });
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works: anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          { id: testJobIds[0], title: "J1", equity: "0.1", salary: 1 },
          { id: testJobIds[1], title: "J2", equity: "0.2", salary: 2 },
          { id: testJobIds[2], title: "J3", equity: null, salary: 3 },
        ],
      },
    });
  });

  test("works: anon (company w/o jobs)", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
        jobs: [],
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works: admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth: anon", async function () {
    const resp = await request(app).patch(`/companies/c1`).send({
      name: "C1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth: non admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works: admin", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth: anon", async function () {
    const resp = await request(app).delete(`/companies/c1`);

    expect(resp.statusCode).toEqual(401);
  });

  test("unauth: logged in - not admin", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
  });

  test("not found: no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
