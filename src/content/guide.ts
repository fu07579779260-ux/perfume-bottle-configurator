import type { Language } from '@/i18n/strings'

// The print & assembly guide, in both languages.

type Text = Record<Language, string>

export interface GuideSection {
  id: string
  title: Text
  steps: Text[]
}

export const GUIDE: GuideSection[] = [
  {
    id: 'before',
    title: { en: 'Before you print', zh: '打印之前' },
    steps: [
      {
        en: 'Measure your glass bottle: body diameter and height, the neck, and the pump collar. If it differs from the preset, enter its sizes as a custom bottle.',
        zh: '量一下你的玻璃瓶：瓶身直径和高度、瓶口，以及喷头底座。如果和预设不一样，就按自定义内胆填入尺寸。',
      },
      {
        en: 'Print the fit test rings first (a few minutes). Pick the ring that slides on by hand without wobbling; the app sets that clearance.',
        zh: '先打印配合测试环（几分钟就好）。选能用手推上去又不晃的那个环，应用会自动设成那个间隙。',
      },
      {
        en: 'Look at the checks list in the Printing section. Warnings are worth fixing; notes tell you what the app already adjusted.',
        zh: '看一下"打印"一节里的检查列表。警告最好先处理；提示是告诉你应用已经帮你调整了什么。',
      },
    ],
  },
  {
    id: 'fdm',
    title: { en: 'Printing on FDM', zh: '用 FDM 打印' },
    steps: [
      { en: 'Shells stand upright on their base; halves lie on their flat cut face. No supports are needed for the default shapes.', zh: '外壳立着打印，底部贴平台；左右两半平躺在切面上。默认造型都不需要支撑。' },
      { en: 'PLA or PETG, 0.2 mm layers, at least 3 walls; 0.12 mm layers bring out fine textures and text.', zh: '用 PLA 或 PETG，层高 0.2 mm，至少 3 圈外壁；想让细纹理和文字更清楚，可以用 0.12 mm 层高。' },
      { en: 'Keep textures bold: grooves of at least 1 mm and text of 5 mm or more print clearly.', zh: '纹理要做得明显一些：至少 1 mm 的沟槽和 5 mm 以上的文字才打得清楚。' },
    ],
  },
  {
    id: 'resin',
    title: { en: 'Printing in resin', zh: '用光固化树脂打印' },
    steps: [
      { en: 'Tilt parts 30–45° and put supports on faces that won’t be seen, like the inside of the floor.', zh: '部件倾斜 30–45° 摆放，支撑加在看不见的面上，比如底板内侧。' },
      { en: 'Add a drain path for hollow parts, then wash in isopropyl alcohol and cure fully before fitting the glass.', zh: '中空的部件要留排液孔；打印后用异丙醇清洗，彻底二次固化后再装玻璃瓶。' },
      { en: 'Resin shows coral grooves, facets and openwork in the finest detail.', zh: '树脂最能把珊瑚沟槽、切面和镂空的细节表现出来。' },
    ],
  },
  {
    id: 'sls',
    title: { en: 'Ordering from a print service', zh: '在打印服务下单' },
    steps: [
      { en: 'Upload the parts ZIP or 3MF and choose PA12 nylon. Send the spec sheet along so they see the design and its clearances.', zh: '上传分件 ZIP 或 3MF，选择 PA12 尼龙。把规格页一起发过去，让对方看到设计和间隙。' },
      { en: 'Ask for bead-blasting for a smooth matte finish, or dyeing for colour.', zh: '可以要求喷砂得到细腻的哑光表面，或者染色。' },
    ],
  },
  {
    id: 'finish',
    title: { en: 'Finishing', zh: '后处理' },
    steps: [
      { en: 'Sand with 240 then 400 grit, or brush on filler primer to hide layer lines before painting.', zh: '先用 240 目再用 400 目砂纸打磨，或者刷一层填充底漆盖住层纹，再上漆。' },
      { en: 'A metallic spray coat gives a cast-metal look, like the luxury references; a clear coat adds shine.', zh: '喷一层金属漆会有铸造金属的质感，像那些奢侈品参考案例；清漆可以增加光泽。' },
      { en: 'Keep paint off the spigot and the inside of the cap socket, or the cap won’t fit.', zh: '外壳顶部的凸环和瓶盖内侧的凹槽不要上漆，否则瓶盖会装不上。' },
    ],
  },
  {
    id: 'assemble',
    title: { en: 'Assembling', zh: '组装' },
    steps: [
      { en: 'From the top: slide the glass bottle into the shell, then push the cap onto the ring on top.', zh: '从顶部放入：把玻璃瓶放进外壳，再把瓶盖套到顶部的凸环上。' },
      { en: 'From the bottom: unscrew the pump, push the bottle in from below, screw or snap the base cap in (a coin turns the threaded one), and screw the pump back on.', zh: '从底部塞入：先拧下喷头，把瓶子从底部推进去，拧上或卡上底盖（螺纹底盖可以用硬币拧），再把喷头拧回去。' },
      { en: 'Two halves: press the dowels into one half, or glue the magnets in (check that each pair attracts), lay the bottle in and close the other half.', zh: '左右两半：把定位销压进其中一半，或者把磁铁粘进去（确认每一对是相吸的），放入瓶子，再合上另一半。' },
    ],
  },
  {
    id: 'fix',
    title: { en: 'If something doesn’t fit', zh: '如果装不上' },
    steps: [
      { en: 'Use "After a test print" in the configurator: say what was too tight or too loose, and the app saves the next version with new clearances.', zh: '在配置器里用"试打印之后"：告诉它哪里太紧或太松，应用会用新的间隙保存下一版。' },
      { en: 'A shell that is still loose at the smallest clearance: add friction ribs. A cap that keeps falling off: choose a snap fit or magnets.', zh: '间隙已经最小、外壳还是松：加内侧摩擦筋。瓶盖总是掉：改用卡扣或磁吸。' },
    ],
  },
]
