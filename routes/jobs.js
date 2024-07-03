"uses strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNewSchema.json");
const jobUpdateSchema = require("../schemas/jobUpdateSchema.json");
const jobSearchSchema = require("../schemas/jobSearchSchema.json");

const router = new express.Router({ mergeParams: true });

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { title, salary, equity, companyHandle }
 *
 * Authorization required:  admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobNewSchema, {
    required: true,
  });
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET /  =>
 *  { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 *
 * Can filter on provided search filters:
 * - salary
 * - equity (boolean, if false or null/undefined will return all equities)
 * - title (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  let query = req.query;
  // need to convert salary to int, and equity to bool, arrive as type string
  if (query?.minSalary) query.minSalary = +query.minSalary;
  query.hasEquity = query.hasEquity === "true";

  const validator = jsonschema.validate(query, jobSearchSchema, {
    required: true,
  });

  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAll(query);
  return res.json({ jobs });
});

/** GET /[jobId] => { job }
 *
 * Returns { id, title, salary, equity, company }
 *   where company is { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
  return res.json({ job });
});

/** PATCH /[jobId]  { fld1, fld2, ... } => { job }
 *
 * Data can include: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.patch(
  "/:id",
  ensureAdmin,
  async function (req, res, next) {
    const validator = jsonschema.validate(req.body, jobUpdateSchema, {
      required: true,
    });
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  }
);

/** DELETE /[handle]  =>  { deleted: id }
 *
 * Authorization required: admin
 */

router.delete(
  "/:id",
  ensureAdmin,
  async function (req, res, next) {
    await Job.remove(req.params.id);
    return res.json({ deleted: +req.params.id });
  }
);

module.exports = router;
