module.exports = [
  "Your auth middleware is too slow because it opens a new database connection for every request.",
  "You should drop table users now, this cannot be undone.",
  "Config is wrong. ```js\nconst token = process.env.TOKEN;\n```",
];
