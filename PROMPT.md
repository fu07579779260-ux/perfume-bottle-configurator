I want to build a web app: a configurator for 3D-printable perfume bottles.

Context: this is one of three configurable 3D-printed consumer products our
team is documenting for a short design workshop (the other two are a keycap
configurator and an eyewear configurator). The perfume bottle configurator
focuses on how a bottle's silhouette, proportions, surface and cap express a
person's style or a brand's identity.

The product is a standard glass inner bottle (with its spray pump and neck)
that stays the same for every design, wrapped in a customisable 3D-printed
outer shell and cap. The shell must fit the glass bottle and hold it securely;
the cap must fit over the pump. Because the glass bottle can be replaced or
refilled and re-inserted, the printed shell is the part that carries the
design. The shell can be a full sleeve, have windows that show the liquid
level, or be an open frame ("exoskeleton") that lets the glass show through.

The first version should offer about five base silhouettes, for example
Column, Teardrop, Faceted Prism, Pebble and Exoskeleton Frame. The user picks a
silhouette, then adjusts its proportions (e.g. height, shoulder height,
shoulder width, base width, corner rounding), chooses a surface texture (e.g.
smooth, fluted ribs, facets, waves, cellular openwork) and a cap form (e.g.
cylinder, sphere, faceted gem, sculptural), and can optionally add initials
or a short brand mark in relief. The personalisation flow we want to show is:
choose a silhouette → adjust proportions → pick a surface texture → design
the cap → add initials / brand mark → preview the model → 3D print →
assemble around the glass bottle → refine based on feedback.

Reference cases to learn from (see CASES.md):
- Formula 1 × Ross Lovegrove "Engineered" (2020): standard 75 ml flask inside
  a printed exoskeleton; the flask is replaceable and the shell is reused.
- Viktor&Rolf Flowerbomb 15th anniversary (2019): an unchanged iconic bottle
  dressed in a printed shell that carries the brand story; numbered pieces.
- Nefer (A' Design Award 2021): skeletal, organic openwork form.
- Guerlain Bee Bottle online 3D configurator (2019): step-by-step choices
  with realistic glass and liquid rendering that also works on phones.
- Parametric bottle families in Grasshopper (Applied Sciences, 2025):
  profile curve from control points, revolved; proportions as parameters.
- Nervous System "Cell Cycle": design in the browser, save/share, then print.
- Hobbyist atomizer shells and replacement caps (MakerWorld): snap-fit and
  twist-lock fits, viewing windows, support-free printing.

Before writing any code, interview me about what it needs.
- Ask ONE question at a time and wait for my answer.
- Start broad (who is it for, what should they get at the end), then go
  specific (silhouettes, proportions, parameters, ranges, the glass inner
  bottle and how the shell and cap fit it, surface textures, cap forms,
  personal style vs. brand expression, initials / brand mark, printers,
  materials, finishes, exports, how it should look and feel).
- Ask which ideas from the reference cases I want to use, and which not.
- If my answer is vague, ask a follow-up.
- Suggest options when I'm unsure, but let me decide.
- After about 10–15 questions, summarise what you heard and ask me to confirm.

Then write PLAN.md with: goal, users, inputs → process → outputs,
parameters (name, unit, range), constraints, tech stack, pages,
out of scope, and a build order in small steps. Stop there.

Tech stack (do not change without asking me):
Vite + React + TypeScript + Tailwind CSS. UI components: shadcn/ui.
3D: React Three Fiber + drei. Rhino export: rhino3dm.
