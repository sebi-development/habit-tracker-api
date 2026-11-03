## API Design with Node.js, v5 Course

This is a companion repository for the [API Design with Node.js, v5](https://frontendmasters.com/courses/api-design-nodejs-v5) course on Frontend Masters.
[![Frontend Masters](https://static.frontendmasters.com/assets/brand/logos/full.png)](https://frontendmasters.com/courses/api-design-nodejs-v5)

### Course Notes

Click [here](https://api-design-with-node-v5.super.site/) to view the course notes on Notion.

### Setup Instructions

```bash
# Node.js 23.6.0 or higher and pnpm are required for this project
git clone https://github.com/Hendrixer/api-design-node-v5.git
cd api-design-node-v5
pnpm install
```

### Branches

- `main` is the starter project for the course
- `lesson-X` branches represent checkpoints for starting each section [in the notes](https://api-design-with-node-v5.super.site/). These are only helpful if you wanted to start at a specific section and are not following the course from the beginning.
- `lesson-X-solution` branches contain the completed code for each section [in the notes](https://api-design-with-node-v5.super.site/). You can `git diff` these branches with the `lesson-X` branches to see what code changed in each section
- `live-lesson-X` branches are the live coded (solution) branches Scott pushes at the end of each section. They are similar to the `lesson-X-solution` branches.

**Note:** The `live-lesson-X` branches are the best for debugging issues in your code since they match exactly what Scott codes during the course.
