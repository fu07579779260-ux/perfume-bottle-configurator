# 香水瓶配置器 · 实际案例与可借鉴点

我们的产品设定：**标准玻璃内胆（不变）+ 可定制的 3D 打印外壳和瓶盖**。可调的是轮廓、比例、表面纹理和瓶盖造型，个性化的重点是个人风格和品牌表达。

下面按「和我们有多接近」排序。每个案例都写了：它是什么、可以拿来用的部分、不要照搬的部分。

> 说明：资料大多来自品牌新闻稿、行业媒体和供应商自己的宣传页（2019–2025）。价格、重量、转化率等数字只能作参考，有些来源之间互相矛盾，文中都标了出来。

---

## 1. Formula 1 × Ross Lovegrove「Engineered Collection」（2020）

**是什么**：一个由 F1 授权、Designer Parfums 推出的香水系列，共五款香型。每瓶都是一个 75 ml 的金属化玻璃内瓶，外面套着用 DLS 光固化打印的树脂"外骨骼"。用完以后内瓶可以换掉，再装回原来的外骨骼里。售价约 £195 / €225 / $250。在它之前（2019），Lovegrove 还做过三件钛金属打印的限量艺术品。各来源给的价格（最高 $10,000）、重量（290 g 或 860 g）和打印时间（15 h 或 24 h）互相矛盾。

**可借鉴**（这是和我们结构**最接近**的案例）：
- **产品架构**：「标准内瓶 + 打印外壳」，内瓶可替换、可续装。这正好可以作为我们"为什么用 3D 打印"的核心论据。
- **结构语言**：外壳是"夹住 / 包住"内瓶的骨架，而不是一个完整的套筒，这样玻璃和液体能露出来。可以作为一种轮廓或纹理选项（"外骨骼 / 镂空框架"）。
- **故事化命名**：每款形态都有名字和灵感来源（赛车座舱、空气动力学）。配置器里的基础轮廓也可以这样命名并配一句说明。

**不要照搬**：钛金属打印和收藏级定价。工作坊用 FDM/树脂打印就够了。

## 2. Viktor&Rolf「Flowerbomb」15 周年限量版（2019）

**是什么**：Viktor&Rolf 与 ERPRO Group、欧莱雅合作，用 Carbon 的 DLS 技术给经典瓶身打印了一层玫瑰金色的荆棘和花枝外壳。只做了 15 件，每件都独一无二，手工打磨和组装，编号，售价 $2,500，仅在官网销售。

**可借鉴**：
- **品牌表达层**：经典瓶子本身不改，用打印外壳来承载品牌叙事。这和"标准内胆 + 定制外壳"的逻辑完全一致，适合我们的「品牌表达」方向。
- **唯一编号**：每件作品有编号。配置器可以给每个导出的设计生成一个设计编号 / 参数码，印在外壳底部或写进导出文件。
- **后处理环节**：流程里写明打磨、上色、组装。我们的流程（打印 → 套到玻璃瓶上组装）可以加一步「后处理建议」。

**不要照搬**：花枝这类高度复杂的有机雕塑，很难参数化，也很难用 FDM 打印。

## 3. Nefer 香水瓶（Amr Ibrahim Mousa，2021 A' Design Award 银奖）

**是什么**：一个用 3D 打印做的骨架状、有机形态的瓶子，曲线来自女性身体线条。

**可借鉴**：
- **镂空 / 骨架纹理**：作为一种「表面纹理」选项，让玻璃内胆从缝隙里透出来。
- **灵感 → 曲线**：用"身体曲线""植物"这类灵感词来命名轮廓预设，帮助用户把个人风格和形态对应起来。

**不要照搬**：太细的骨架杆件。需要在参数里设最小杆宽或最小壁厚，保证能打印出来。

## 4. Guerlain 蜂巢瓶在线 3D 配置器（Hapticmedia，2019 年底上线）

**是什么**：娇兰的 Bee Bottle（蜂巢瓶）网页 3D 配置器。用户可以选瓶子的尺寸和颜色、加装饰元素、刻字、选丝带，还可以选瓶里装哪款香水。电脑、平板、手机都能用。技术难点是实时渲染玻璃、液体和金色的透明与折射效果。供应商自称 82% 的商品页访客会打开 3D 视图（未经独立核实）。现在官网似乎只剩刻字服务。

**可借鉴**（这是**交互和视觉**上最好的参考）：
- **配置流程**：按步骤一步步选（尺寸 → 颜色 → 装饰 → 刻字），每一步都有实时 3D 反馈。
- **玻璃渲染**：要让玻璃内胆和液体看起来真实。drei 里的 `MeshTransmissionMaterial` 可以做到类似的折射效果。
- **手机端可用**：工作坊现场很多人会用手机打开。

**不要照搬**：它只能装饰，不能改几何形状。我们的卖点恰恰是改形态（轮廓、比例），这是两者的差异。

## 5. 奢侈品牌刻字服务（Parfums de Marly、Dior、Louis Vuitton、Viktor&Rolf 等）

**是什么**：在官网或门店给瓶身刻名字或寄语。Parfums de Marly 规定最多 2 行、每行 13 个字母，刻在瓶背面，墨色跟随香型。Louis Vuitton 的很多瓶子还标明可续装。

**可借鉴**：
- **个人文字的约束**：如果做"首字母 / 名字浮雕在外壳上"，可以直接借用这种明确的限制（行数、字符数、位置），既好实现也好打印。
- **可续装 = 可持续卖点**：和第 1 个案例互相印证。

## 6. 参数化香水瓶研究（Grasshopper）

**是什么**：
- Martín-Mariscal 等人 2025 年发表在 *Applied Sciences* 的论文，用 Grasshopper 为香水瓶建立"产品族"，可变参数包括颜色、尺寸、材料和圆角。
- Grasshopper 社区的案例：一个脚本能生成超过 30 万种瓶子组合；还有一个 2009 年的帖子，用 16 个滑块控制瓶子轮廓（轮廓曲线的控制点、高度、偏移、参考圆），附 .ghx/.3dm 文件。

**可借鉴**（这是**参数模型**的参考）：
- **轮廓 = 控制点曲线 + 旋转 / 放样**，比例参数（总高、肩高、肩宽、底宽、圆角）直接驱动控制点。这和 rhino3dm 导出很自然地衔接。
- **产品族思路**：先定几个基础轮廓（预设），再在每个预设下微调参数，避免组合爆炸。
- **可变维度的划分**：形状、尺寸、材料、圆角分开控制，正好对应我们的「轮廓 / 比例 / 纹理 / 瓶盖」四块。

## 7. Nervous System「Cell Cycle」网页设计工具（2009 年起，2014 年改版）

**是什么**：设计工作室 Nervous System 做的 WebGL 浏览器应用。用户通过塑形、扭转、细分，把基础网格变成细胞状的镂空结构，可以保存、分享、重新载入，再下单用尼龙或银打印。目前是否还在运营没有确认。

**可借鉴**：
- **"浏览器里设计 → 直接打印"**的完整闭环，正是我们流程的原型。
- **保存 / 分享 / 载入设计**：比如用链接或参数码分享给别人，方便工作坊里互相看作品。
- **生成式纹理**：细胞、泰森多边形这类纹理可以作为高级纹理选项。

## 8. MakerWorld / Printables 上的爱好者作品（香水分装瓶外壳、替换瓶盖）

**是什么**：给 Scentbird 分装瓶做的打印外壳（卡扣式、免支撑、旋转锁防误喷、开窗可以看剩余液量），给 Creed 瓶子做的 PLA 卡扣替换瓶盖，还有适配 150×25 mm 标准玻璃瓶的可调高度外壳。

**可借鉴**（这是**落地和打印**层面最实用的参考，最适合工作坊用的 FDM）：
- **配合方式**：卡扣、旋转锁、摩擦配合。这些可以作为「瓶盖造型」和「外壳固定方式」的选项。
- **开窗**：在外壳上开窗看液面，做成一个参数（窗口宽度 / 数量）。
- **免支撑打印**：作为一条设计约束（比如悬垂角不超过 45°）。
- **先测量内胆**：用户要先选或输入玻璃内胆的规格（直径、高度、瓶口），外壳内壁根据这些尺寸加配合间隙。

**不要照搬**：直接用他人模型要注意授权。

## 9. 欧莱雅内部的 3D 打印原型流程（背景参考）

**是什么**：到 2020 年，欧莱雅所有设计中心都配了 3D 打印机，原型周期从几天缩短到 12 小时。它还和惠普合作打印灌装线上固定瓶子的可调定位托（据称成本降 33%、时间降 66%）。

**可借鉴**：用来支撑我们流程里「打印 → 拿在手里试 → 改进」这一环的合理性。

---

## 汇总：配置器的每一块从哪里借鉴

| 配置器模块 | 主要参考 | 借鉴什么 |
|---|---|---|
| 产品架构（内胆 + 外壳 + 瓶盖） | F1 Engineered、Flowerbomb | 标准内瓶不变、外壳可替换 / 可续装、外壳承载品牌 |
| 轮廓 / 剖面 | 参数化研究（#6）、F1、Nefer | 控制点曲线 + 旋转；带故事的命名预设 |
| 比例参数 | 参数化研究（#6） | 高度、肩高、肩宽、底宽、圆角分开控制 |
| 表面纹理 | Nefer、Cell Cycle、F1 外骨骼 | 镂空骨架、细胞纹理、开窗，加最小杆宽约束 |
| 瓶盖造型 | MakerWorld 瓶盖、Flowerbomb | 卡扣 / 旋转 / 摩擦配合，加装饰性顶部 |
| 个人 / 品牌文字 | 奢侈品刻字服务、Flowerbomb 编号 | 首字母浮雕（行数、字数限制），加设计编号 |
| 3D 预览 | Guerlain × Hapticmedia | 分步配置、真实玻璃和液体渲染、手机可用 |
| 保存 / 分享 / 导出 | Cell Cycle | 设计可保存和分享，导出后直接打印 |
| 打印与装配 | MakerWorld 外壳、欧莱雅原型 | 内胆尺寸 + 配合间隙、免支撑、打印 → 试装 → 改进 |

**一句话总结**：用 **F1 的结构**、**Flowerbomb 的品牌表达方式**、**Nefer 和 Cell Cycle 的纹理**、**Guerlain 的交互和渲染**、**Grasshopper 研究的参数模型**、**MakerWorld 的配合与打印细节**。

---

## 来源

- [3Dnatives – Formula 1 金属打印香水瓶](https://www.3dnatives.com/en/3d-printed-perfume-bottles-formula-1-170120204/)
- [3DPrint.com – Viktor&Rolf 与 Formula 1 的 3D 打印香水瓶](https://3dprint.com/276674/making-scents-unique-viktorrolf-and-formula-1s-new-3d-printed-perfume-bottles-are-striking/)
- [Wallpaper – Ross Lovegrove 的 F1 香水瓶](https://www.wallpaper.com/beauty-grooming/ross-lovegrove-f1-racing-car-perfume-bottle)
- [VoxelMatters – F1 3D 打印香水系列](https://www.voxelmatters.com/formula-1-launches-3d-printed-f1-fragrance-collection-with-designer-ross-lovegrove/)
- [F1 Engineered 新闻稿 (PDF)](https://mma.prnewswire.com/media/1333895/F1_Engineered_Press_Release_English_pdf.pdf?p=pdf)
- [Formula1.com – 阿布扎比预览新香水系列](https://www.formula1.com/en/latest/article/formula-1-previews-new-fragrance-collection-in-abu-dhabi.5mArPlXLPdnw61NmLc0rqI)
- [L'Oréal – Flowerbomb 3D 打印](https://www.loreal.com/en/news/brands/flowerbomb-3d-vr/)
- [3Dnatives – Flowerbomb 3D 打印外壳](https://www.3dnatives.com/en/3d-printed-flowerbomb-perfume-set-140120216/)
- [Yanko Design – Nefer 骨架香水瓶](https://www.yankodesign.com/2021/09/27/the-nefer-perfume-comes-in-a-hauntingly-beautiful-skeletal-bottle-created-through-3d-printing/)
- [Hapticmedia – Guerlain 香水瓶 3D 配置器](https://hapticmedia.com/success-stories/personalized-perfume-bottle-guerlain/)
- [Hapticmedia – Guerlain 在线个性化](https://hapticmedia.com/blog/3d-perfume-configurator-guerlain-online-personalization)
- [Premium Beauty News – Guerlain 把个性化搬到网上](https://www.premiumbeautynews.com/en/guerlain-duplicates-on-the-web-the,16002)
- [Parfums de Marly – 瓶身个性化说明](https://support.parfums-de-marly.com/hc/en-us/articles/36399406461713-Can-I-personalize-my-bottle)
- [Louis Vuitton – 香水个性化](https://en.louisvuitton.com/eng-nl/gifts/personalization/perfumes-personalization/_/N-tm533gg)
- [Dior – Personalization Studio](https://dior.com/en_us/beauty/engraving-service)
- [MDPI Applied Sciences – Grasshopper 产品族研究 (2025)](https://www.mdpi.com/2076-3417/15/11/6243)
- [Grasshopper3d – 香水瓶设计过程](https://grasshopper3d.com/video/perfume-bottle-design-process)
- [Grasshopper3d 论坛 – 参数化瓶子轮廓](https://www.grasshopper3d.com/xn/detail/2985220:Topic:13750)
- [Google Experiments – Cell Cycle](https://experiments.withgoogle.com/cell-cycle)
- [Nervous System 博客 – 与 Nervous System 共创](https://n-e-r-v-o-u-s.com/blog/?p=6023)
- [MakerWorld – Creed 风格瓶盖](https://makerworld.com/models/1469989)
- [MakerWorld – 香水 / 分装瓶外壳示例](https://makerworld.com/models/2577217)
- [Scento – 香水包装与 3D 打印趋势（欧莱雅数据）](https://www.scento.com/blog/perfume-packaging-trends-3d-printing-insights)
