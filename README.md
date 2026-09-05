# Post-Fair Pizza

One-night group Domino's order picker. Vite + React front end on GitHub Pages, Convex for shared realtime state.

- Group link: https://mrdocprofpj.github.io/postfairpizza/
- Host link (adds summary + lock): https://mrdocprofpj.github.io/postfairpizza/?host
- Convex dashboard: https://dashboard.convex.dev/t/pjgoldfish-yahoo-com/postfairpizza

## Redeploy

```sh
npx convex deploy -y                                   # backend
VITE_CONVEX_URL=https://handsome-boar-891.convex.cloud bun x vite build --base=/postfairpizza/
cd dist && touch .nojekyll && git init -b gh-pages && git add -A && git commit -qm deploy \
  && git push -f https://github.com/MrDocProfPj/postfairpizza.git gh-pages && cd .. && rm -rf dist/.git
```
