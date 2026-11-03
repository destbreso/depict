# Contributing

Issues and pull requests are welcome: fixes to the kit, better drawing and motion, clearer references, new examples. The skill's own rules (how a board is written, drawn and checked) are in `skills/depict/SKILL.md` and its `references/`; this file is how the repository itself is worked on.

## Working on it

```sh
npm test             # the kit's tests
npm run examples     # build and audit every example board
npm run characters   # remake the characters' presentations in examples/characters/
npm run looks        # remake the looks the friends example casts
```

Open a built board directly in the browser. A live-reloading preview (Live Server, Live Preview) reloads the page on every file change, which restarts the film while you are watching it.

## A change to the kit is a revisit of every character

Before changing the kit, keep every character as it is with `node skills/depict/scripts/revisit.mjs <character> --out <folder>`; after, hold each against it with `--against <folder>`. Nothing may change that the change did not mean to change: the model sheets, the looks, every frame of the test boards, the example boards and the looks cast into them. `references/characters.md` ("Revisiting a character") has the steps. A project that builds its boards with depict rebuilds them through its own series config after a kit change.

## The characters this repository holds

It holds the marker (depict's own guide), Stuart and the pencil (both drawn by Niki), and invented examples such as Pip. A character drawn by any other child does not come here: not its module, its drawings, a test or a doc, and not its name in a commit message. Families agree to the project their child drew for, not to a public repository. When such a character needs something the kit cannot do, add it to the kit as a general feature, test it with the characters here, and keep the character in its own project.

## Releasing

Installed copies update only when the version changes: Claude Code keys its plugin cache by the version in `plugin.json`, so a change shipped without a bump never reaches anyone who has the plugin.

1. Raise the version in all four places, to the same number: `package.json`, `.claude-plugin/plugin.json`, the plugin's entry in `.claude-plugin/marketplace.json`, and `metadata.version` in `skills/depict/SKILL.md`.
2. Add the version's entry at the top of `CHANGELOG.md`: what a user notices, one line each.
3. Keep `SKILL.md`'s front matter strict YAML: the description quoted, and no longer than 1024 characters. Past either, `npx skills add` refuses the skill.
4. Run `npm test`, `npm run examples` and `claude plugin validate .`, then `claude plugin tag .`, which checks that `plugin.json` and the marketplace entry agree and creates the tag `depict--v<version>`.
5. Push the commit with its tag (`git push --follow-tags`). Users then get it with `claude plugin update depict@depict`, or by auto-update.
