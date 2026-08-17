/**
 * 场景库：一系列"需要写提示词才能完成"的真实情景。
 *
 * 每个场景包含：
 *  - category  分类
 *  - title     场景名
 *  - situation 背景/处境（给用户的）
 *  - task      要完成的任务（给用户的）
 *  - expectation 期望成果要点（只给评分模型看，帮助它判断"提示词是否真的完成任务"）
 */

export const CATEGORIES = [
  '写作创作',
  '编程开发',
  '翻译润色',
  '数据分析',
  '市场营销',
  '客服沟通',
  '学习教育',
  '生活助理',
];

export const SCENARIOS = [
  // ---------------- 写作创作 ----------------
  {
    id: 'coffee_shop_copy',
    category: '写作创作',
    title: '咖啡店开业文案',
    situation: '你是一位创业者，即将在市中心的写字楼商圈开一家精品手冲咖啡店。',
    task: '写一份用于公众号和门店海报的开业宣传文案。',
    expectation: '包含吸引人的标题、正文和一句 Slogan；突出"精品手冲"和"慢下来"的调性；面向附近写字楼白领。',
  },
  {
    id: 'article_early_rise',
    category: '写作创作',
    title: '公众号科普文章',
    situation: '你运营一个面向职场人的公众号，想做一篇关于"如何养成早起习惯"的科普文章。',
    task: '写一篇约 800 字的公众号文章。',
    expectation: '结构清晰（引入-方法-结尾）；方法可落地；语言通俗不鸡汤；适合职场人群。',
  },
  {
    id: 'sci_fi_opening',
    category: '写作创作',
    title: '科幻小说开头',
    situation: '你正在创作一部科幻短篇小说，需要一个能抓住编辑的精彩开头。',
    task: '写一个 300 字左右的开头，要有悬念。',
    expectation: '快速建立世界观和冲突；结尾留悬念；文笔有质感。',
  },
  {
    id: 'resume_polish',
    category: '写作创作',
    title: '简历经历润色',
    situation: '你有一段平淡的工作经历："负责运营公司公众号，发文章"。想把它改写成有亮点的简历描述。',
    task: '把这段经历改写成简历风格描述，突出成果和数据。',
    expectation: '用 STAR 式表达；给出量化指标；语气专业简洁。',
  },
  // ---------------- 编程开发 ----------------
  {
    id: 'rename_script',
    category: '编程开发',
    title: '批量重命名脚本',
    situation: '你的相机里有几千张照片，文件名是 IMG_0001 这种，想按拍摄日期重新命名。',
    task: '生成一个 Python 脚本完成批量重命名。',
    expectation: '脚本可直接运行；按拍摄日期（EXIF）重命名；处理重名冲突；说明依赖与用法。',
  },
  {
    id: 'explain_code',
    category: '编程开发',
    title: '解释并优化代码',
    situation: '同事给你一段又长又难懂的 JavaScript 代码，你想快速理解并优化。',
    task: '解释这段代码做了什么，并给出优化建议。',
    expectation: '逐段解释逻辑；指出可优化点（性能/可读性）；给出改写示例。',
  },
  {
    id: 'sql_report',
    category: '编程开发',
    title: 'SQL 销售统计',
    situation: '你有一张订单表 orders(id, product, amount, created_at)，要写报表。',
    task: '写 SQL 统计每月销售额及环比变化。',
    expectation: '正确使用日期函数和分组；计算出环比；考虑 NULL/空数据；给出完整 SQL。',
  },
  {
    id: 'regex_extract',
    category: '编程开发',
    title: '正则提取邮箱',
    situation: '你抓取了一个网页的 HTML，想从中提取所有邮箱地址。',
    task: '给出一个正则表达式并写出提取代码。',
    expectation: '正则合理；说明匹配规则；提供示例代码和边界情况说明。',
  },
  // ---------------- 翻译润色 ----------------
  {
    id: 'biz_email_translate',
    category: '翻译润色',
    title: '商务邮件翻译',
    situation: '你要给国外合作方发一封邮件，内容涉及项目延期和新的交付时间。',
    task: '把一封中文商务邮件翻译成地道的英文。',
    expectation: '语气正式且委婉；用词地道不中式；保留关键信息（时间、事由、承诺）。',
  },
  {
    id: 'abstract_polish',
    category: '翻译润色',
    title: '学术摘要润色',
    situation: '你写了一篇论文摘要，导师说语言生硬、不专业。',
    task: '把摘要润色得更流畅、专业、地道。',
    expectation: '用词学术化；句子衔接自然；不改变原意；符合学术写作规范。',
  },
  {
    id: 'slogan_translate',
    category: '翻译润色',
    title: '品牌口号翻译',
    situation: '你的中文品牌口号"好喝不将就"，要出海，翻译成英文并保留品牌感。',
    task: '翻译品牌口号并给出多个备选方案。',
    expectation: '给出多个方案；解释各自风格与适用场景；保留双关/韵味。',
  },
  // ---------------- 数据分析 ----------------
  {
    id: 'sales_weekly_report',
    category: '数据分析',
    title: '销售周报分析',
    situation: '你是运营，有一份本周各渠道的销售数据（渠道、订单数、销售额、客单价、转化率）。',
    task: '基于这些数据写一份结构化的周报分析。',
    expectation: '分渠道对比；指出亮点与问题；给出结论和下一步建议；条理清晰。',
  },
  {
    id: 'dau_drop_diagnosis',
    category: '数据分析',
    title: 'DAU 下降排查',
    situation: '产品 DAU 环比下降 10%，老板让你尽快定位原因，但老板不懂技术。',
    task: '给出排查思路，并用老板能听懂的话解释。',
    expectation: '列出可能的排查方向（版本/活动/渠道/大盘）；区分内因外因；结论通俗。',
  },
  // ---------------- 市场营销 ----------------
  {
    id: 'ai_study_positioning',
    category: '市场营销',
    title: '学习 APP 定位',
    situation: '你做了一款面向大学生的 AI 学习助手 APP，要确定定位和卖点。',
    task: '给出产品定位、目标用户画像和 3 个核心卖点。',
    expectation: '定位差异化；用户画像具体；卖点可验证、能打动目标人群。',
  },
  {
    id: 'short_video_script',
    category: '市场营销',
    title: '短视频推广脚本',
    situation: '你要为一款降噪耳机写一条 60 秒的短视频推广脚本。',
    task: '写出完整的短视频脚本（分镜+文案）。',
    expectation: '符合短视频节奏（前 3 秒抓人）；有钩子、痛点、卖点、行动号召；分镜清晰。',
  },
  {
    id: 'competitor_analysis',
    category: '市场营销',
    title: '竞品分析框架',
    situation: '你的团队想上线一款笔记软件，需要先分析市面两款主流笔记产品。',
    task: '给出一份竞品分析框架，并示范怎么填。',
    expectation: '框架维度全面（功能/定价/用户/口碑/差异化）；提供填写示例。',
  },
  // ---------------- 客服沟通 ----------------
  {
    id: 'complaint_reply',
    category: '客服沟通',
    title: '快递投诉回复',
    situation: '客户因快递延误 5 天且态度恶劣，非常生气，要求赔偿和道歉。',
    task: '写一封安抚客户并给出解决方案的回复话术。',
    expectation: '先共情再解决；情绪管理到位；给出可执行的补偿方案；语气真诚不推诿。',
  },
  {
    id: 'apology_email',
    category: '客服沟通',
    title: '数据丢失道歉信',
    situation: '因产品 bug 导致部分用户笔记数据丢失，需要发一封公开道歉邮件。',
    task: '写一封诚恳的道歉邮件，说明原因和补救措施。',
    expectation: '承认责任不找借口；说明原因和已采取行动；给出具体补救与补偿；可信且有温度。',
  },
  // ---------------- 学习教育 ----------------
  {
    id: 'physics_lesson',
    category: '学习教育',
    title: '初中物理教学设计',
    situation: '你要给初二学生上一堂 45 分钟的"浮力"课。',
    task: '设计一份完整的教学方案。',
    expectation: '含导入/讲解/实验/练习环节；时间分配合理；有互动设计；符合课标。',
  },
  {
    id: 'compound_quiz',
    category: '学习教育',
    title: '复利理解出题',
    situation: '你在给学生讲"复利"，想检验他们是否真懂了。',
    task: '出 5 道考察复利理解的选择题，难度递进，带解析。',
    expectation: '题目不靠死记硬背；干扰项有迷惑性；解析讲清原理；难度递进。',
  },
  // ---------------- 生活助理 ----------------
  {
    id: 'chengdu_trip',
    category: '生活助理',
    title: '成都三日游规划',
    situation: '你计划去成都玩 3 天 2 夜，预算 3000 元，喜欢美食和人文。',
    task: '规划一份详细的行程攻略。',
    expectation: '行程合理（交通/时间衔接）；预算分配明确；突出美食与人文；给出备选方案。',
  },
  {
    id: 'home_fitness',
    category: '生活助理',
    title: '居家健身计划',
    situation: '你想用一个月减脂并适当增肌，每周只能在家练 3 次，无器械。',
    task: '制定一份可执行的训练+饮食计划。',
    expectation: '训练动作无器械可做；安排渐进负荷；饮食建议具体；考虑恢复与安全。',
  },
  {
    id: 'cat_naming',
    category: '生活助理',
    title: '给橘猫起名',
    situation: '你领养了一只橘猫，想给它起个有创意又有寓意名字。',
    task: '推荐一些猫名，并说明寓意。',
    expectation: '名字有创意和记忆点；结合橘猫特点；说明每个名字的寓意或出处。',
  },
  {
    id: 'weekly_meal_plan',
    category: '生活助理',
    title: '一周健康菜单',
    situation: '你一个人住，预算有限，想吃得健康又不重复。',
    task: '制定一周的三餐菜单。',
    expectation: '三餐不重样；包含食材和大致做法；控制预算；标注大致热量。',
  },
  {
    id: 'little_prince_talk',
    category: '生活助理',
    title: '3 分钟读书分享',
    situation: '你要在读书会上用 3 分钟分享《小王子》。',
    task: '写一篇可讲的 3 分钟读书分享稿，带金句。',
    expectation: '口语化适合朗读；结构完整（引入-观点-结语）；提炼 1-2 个核心观点和金句。',
  },
];

export const CATEGORY_SCENARIOS = CATEGORIES.map((c) => ({
  category: c,
  scenarios: SCENARIOS.filter((s) => s.category === c),
}));

/** 随机打乱并取 n 个场景 */
export function randomScenarios(n = 3) {
  const pool = [...SCENARIOS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id);
}
