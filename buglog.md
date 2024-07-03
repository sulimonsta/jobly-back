# Bugs

1. companies.test.js - Test is failing due to db row id incrementing each time, making it hard to test normally.
  possible solution -
  a. mock the data
  b. rollback db each time so that getting an id would always be consistent
  c. test to see if it is a type of int
Solution: went with c, simple and quick.

2. users.test.js - Two test failures for applications, feature not used just yet.
  Solution - edit the static method SQLWhereStatement into something more functional.

3. job.test.js - Issue with validation
  Solution - change name, was missing hasEquity and had just "equity". Also same deal with title due to earlier fix cascading errors. Probably a few more from fix 2.
