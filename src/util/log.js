module.exports = (msg) => {
  if (typeof msg == "string") msg = { msg };

  console.log(
    JSON.stringify(
      {
        ...msg,
        timestamp: new Date().toString(),
      },
      undefined,
      2
    )
  );
};
