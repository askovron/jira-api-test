var express = require("express");
var router = express.Router();
var fetch = require("node-fetch");

router.get("/", function (req, res, next) {
  Promise.all([
    fetch(`https://${process.env.JIRA_TEAM}.atlassian.net/rest/api/3/project/SP/components`),
    fetch(
      `https://${process.env.JIRA_TEAM}.atlassian.net/rest/api/3/search?jql=project%20%3D%20SP%20`
    ),
  ])
    .then(([componentsResponse, issuesResponse]) => {
      if (!componentsResponse.ok || !issuesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      return Promise.all([componentsResponse.json(), issuesResponse.json()]);
    })
    .then(([components, issues]) => {
      const componentsLeadEmpty = components
        .filter(({ lead }) => lead == null)
        .map(({ name }) => name);
      const issuesByComponent = issues.issues.reduce(
        (rslt, issue) => ({
          ...rslt,
          ...issue.fields.components.reduce(
            (addRes, { name }) => ({
              ...addRes,
              [name]: (rslt[name] ?? 0) + 1,
            }),
            {}
          ),
        }),
        {}
      );

      res.json(
        componentsLeadEmpty.reduce(
          (out, component) => Object.assign(out, {
            [component]: issuesByComponent[component],
          }),
          {}
        )
      );
    })
    .catch((e) => res.json({ error: e.message }));
});

module.exports = router;
