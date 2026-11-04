import type { Language } from '@/i18n/strings'

// The reference cases behind the configurator (see CASES.md), and what each
// one led to in the app. Prices and figures are left out: the sources
// disagree on several of them.

type Text = Record<Language, string>

export interface ReferenceCase {
  id: string
  name: string
  year: string
  what: Text
  took: Text
  /** A source to read more */
  source: string
}

export const CASES: ReferenceCase[] = [
  {
    id: 'f1',
    name: 'Formula 1 × Ross Lovegrove, "Engineered" collection',
    year: '2020',
    what: {
      en: 'A standard 75 ml flask held in a 3D-printed resin exoskeleton. When the perfume is used up, the flask is replaced and the printed shell is kept.',
      zh: '一个标准的 75 ml 内瓶，套在 3D 打印的树脂外骨骼里。香水用完后换掉内瓶，打印的外壳继续使用。',
    },
    took: {
      en: 'The whole idea of the app: a standard, refillable glass bottle inside a printed shell, and the Exoskeleton Frame silhouette.',
      zh: '整个应用的核心思路：标准的可续装玻璃内胆加打印外壳，以及外骨骼框架轮廓。',
    },
    source: 'https://www.voxelmatters.com/formula-1-launches-3d-printed-f1-fragrance-collection-with-designer-ross-lovegrove/',
  },
  {
    id: 'flowerbomb',
    name: 'Viktor&Rolf, Flowerbomb 15th anniversary',
    year: '2019',
    what: {
      en: 'The classic bottle, unchanged, dressed in a printed shell of thorny branches and flowers; fifteen numbered pieces, finished by hand.',
      zh: '经典瓶身保持不变，外面套一层打印的荆棘与花枝外壳；只做了十五件，每件编号，手工打磨。',
    },
    took: {
      en: 'The shell as the place for a brand story, the engraved design number on the base, and the finishing advice on the spec sheet.',
      zh: '把外壳当作讲品牌故事的地方、底部刻的设计编号，以及规格页上的后处理建议。',
    },
    source: 'https://www.loreal.com/en/news/brands/flowerbomb-3d-vr/',
  },
  {
    id: 'nefer',
    name: 'Nefer perfume bottle (Amr Ibrahim Mousa)',
    year: '2021',
    what: {
      en: 'A skeletal, organic bottle with curves drawn from the human figure, made with 3D printing.',
      zh: '一个骨架状、有机形态的瓶子，曲线来自人体线条，用 3D 打印制作。',
    },
    took: {
      en: 'Cellular openwork that lets the glass show through, with a minimum rim so it can be printed.',
      zh: '能透出玻璃的细胞镂空纹理，并且设定了最小边框，保证能打印出来。',
    },
    source: 'https://www.yankodesign.com/2021/09/27/the-nefer-perfume-comes-in-a-hauntingly-beautiful-skeletal-bottle-created-through-3d-printing/',
  },
  {
    id: 'guerlain',
    name: 'Guerlain Bee Bottle online configurator (Hapticmedia)',
    year: '2019',
    what: {
      en: 'Choose size, colour, decoration and an engraving step by step, with glass and liquid rendered in real time, also on phones.',
      zh: '一步步选择尺寸、颜色、装饰和刻字，实时渲染玻璃和液体，手机上也能用。',
    },
    took: {
      en: 'The step-by-step panel beside a live preview, the refractive glass and coloured perfume, and a layout that works on phones.',
      zh: '实时预览旁边的分步面板、带折射的玻璃和有颜色的香水，以及手机上也能用的布局。',
    },
    source: 'https://hapticmedia.com/success-stories/personalized-perfume-bottle-guerlain/',
  },
  {
    id: 'engraving',
    name: 'Engraving services of perfume houses',
    year: 'ongoing',
    what: {
      en: 'Names or messages engraved on the bottle, with clear limits such as two lines of a dozen letters on the back.',
      zh: '在瓶身刻名字或寄语，有明确的限制，比如背面最多两行、每行十来个字母。',
    },
    took: {
      en: 'Text relief limited to two lines of twelve characters, placed on the front, back, base or cap.',
      zh: '文字浮雕限制为两行、每行十二个字，可以放在正面、背面、底部或瓶盖顶部。',
    },
    source: 'https://support.parfums-de-marly.com/hc/en-us/articles/36399406461713-Can-I-personalize-my-bottle',
  },
  {
    id: 'grasshopper',
    name: 'Parametric perfume bottle families (Grasshopper)',
    year: '2025',
    what: {
      en: 'Research on bottle "product families": a profile curve from control points, with size, rounding and material as parameters.',
      zh: '关于香水瓶"产品族"的研究：用控制点画轮廓曲线，尺寸、圆角和材料都是参数。',
    },
    took: {
      en: 'Silhouettes as presets with proportion sliders, the control-point outline in the advanced mode, and the Rhino export.',
      zh: '预设轮廓加比例滑块、高级模式里的控制点轮廓，以及 Rhino 导出。',
    },
    source: 'https://www.mdpi.com/2076-3417/15/11/6243',
  },
  {
    id: 'cellcycle',
    name: 'Nervous System, Cell Cycle',
    year: '2009–2014',
    what: {
      en: 'A browser app for designing cellular 3D-printed objects, with designs that can be saved, shared and ordered.',
      zh: '一个在浏览器里设计细胞结构 3D 打印品的应用，设计可以保存、分享，并直接下单打印。',
    },
    took: {
      en: 'Designing in the browser all the way to a printable file, seeded patterns, and saving and sharing designs.',
      zh: '在浏览器里从设计一直做到可打印文件、带种子的图案，以及保存和分享设计。',
    },
    source: 'https://experiments.withgoogle.com/cell-cycle',
  },
  {
    id: 'makerworld',
    name: 'Maker shells and caps (MakerWorld, Printables)',
    year: 'ongoing',
    what: {
      en: 'Printed cases for travel atomisers and replacement caps: snap fits, twist locks, viewing windows, support-free printing.',
      zh: '为香水分装瓶做的打印外壳和替换瓶盖：卡扣、旋转锁、观察窗，以及免支撑打印。',
    },
    took: {
      en: 'Friction, snap and magnet fits, viewing windows, the 45° rules for FDM, the fit test rings and the fit feedback.',
      zh: '摩擦、卡扣和磁吸三种配合，开窗，FDM 的 45° 规则，配合测试环，以及试装反馈。',
    },
    source: 'https://makerworld.com/models/1469989',
  },
  {
    id: 'loreal',
    name: 'In-house prototyping at L’Oréal',
    year: '2020',
    what: {
      en: 'Printers in every design centre, so a packaging prototype takes hours instead of days.',
      zh: '每个设计中心都有打印机，包装原型从几天缩短到几小时。',
    },
    took: {
      en: 'The loop at the heart of the app: print, hold it, give feedback, print the next version.',
      zh: '应用的核心循环：打印、拿在手里、给出反馈，再打印下一版。',
    },
    source: 'https://www.scento.com/blog/perfume-packaging-trends-3d-printing-insights',
  },
]
