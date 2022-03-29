const log = require("./log");

module.exports = (req, res, details, func, error) => {
  if (func && func.name)
    func.callee = {
      name: func.name,
    };
  else if (typeof func == "string") func = { "callee.name": func };

  if (error && typeof error == "string")
    error = {
      stack: error,
    };

  let errMsg = {
    ...(func && {
      functionName: ((func || {}).callee || {}).name,
    }),
    ...(req && {
      api: (req || {}).originalUrl,
    }),
    errorMsg: error.stack,
    ...details,
  };
  log(errMsg);

  if (res) res.status(500).send(errMsg);
};
