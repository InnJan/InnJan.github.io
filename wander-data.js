(function () {
  "use strict";

  window.WANDER_CATEGORIES = [
    { id: "world", title: "看看这个世界", note: "此刻，远处仍在发生。", glyph: "◎" },
    { id: "waste", title: "浪费五分钟", note: "无用并不等于没有意义。", glyph: "◌" },
    { id: "create", title: "创造点什么", note: "把指针交给手和直觉。", glyph: "✦" },
    { id: "read", title: "读点东西", note: "书页也有自己的入口。", glyph: "¶" },
    { id: "serious", title: "认真一点", note: "偶尔，互联网确实能帮忙。", glyph: "⌘" },
    { id: "weird", title: "互联网怪东西", note: "无法归档的，留在这里。", glyph: "※" }
  ];

  window.WANDER_CURATION = {
    reviewedAt: "2026-08-28",
    similarityThreshold: 0.7,
    priorityOrder: ["稳定运营", "无需登录", "免费能力", "无恶意广告", "界面清晰", "移动体验", "功能完整", "中文支持", "加载速度", "独特性"],
    rule: "functionKey 相同且用户进入后完成的主要任务相似度超过 70% 时，只保留综合体验最高的一项。",
    decisions: [
      { candidate: "Smartmockups", status: "replaced", selected: "Shots", reason: "已整合为 Canva Mockups 且需要 Canva 登录；Shots 可直接进入独立编辑器。" },
      { candidate: "24mail.chacuo.net", status: "replaced", selected: "10MinMail", reason: "候选页稳定性与页面状态难以可靠确认；替代项无需注册并自动删除邮件。" },
      { candidate: "iLovePDF", status: "deduplicated", selected: "PDF24 Tools", reason: "核心功能高度重叠；PDF24 中文完整、无需登录且官方说明无人工次数限制。" },
      { candidate: "GreenVideo", status: "rejected", selected: "", reason: "存在独立安全信誉警告，且功能涉及较高版权误用风险。" }
    ]
  };

  window.WANDER_SITES = [
    {
      id: "skyline-webcams", name: "Skyline Webcams", url: "https://www.skylinewebcams.com/",
      description: "去看此刻地球另一端的海浪、街灯和路人。",
      category: "world", tags: ["世界", "摄像头", "旅行", "实时"], filters: ["world"], accent: "blue", size: "wide", symbol: "LIVE", featured: true
    },
    {
      id: "zoom-earth", name: "Zoom Earth", url: "https://zoom.earth/",
      description: "看看云正在往哪儿走，雨又落在谁的窗外。",
      category: "world", tags: ["地球", "气象", "卫星", "实时"], filters: ["world", "tool"], accent: "ink", size: "tall", symbol: "◉", featured: true
    },
    {
      id: "radio-garden", name: "Radio Garden", url: "https://radio.garden/",
      description: "旋转地球，接住一座陌生城市此刻的广播。",
      category: "world", tags: ["广播", "世界", "地图", "声音"], filters: ["world", "sound", "random"], accent: "green", size: "standard", symbol: "FM"
    },
    {
      id: "tune-journey", name: "Tune Journey", url: "https://tunejourney.com/",
      description: "随机降落在地球某处，听那里正在播放的声音。",
      category: "world", tags: ["音乐", "世界", "随机", "地图"], filters: ["world", "sound", "random"], accent: "coral", size: "wide", symbol: "♫", featured: true
    },
    {
      id: "window-swap", name: "WindowSwap", url: "https://www.window-swap.com/",
      description: "借一扇别人的窗，安静看几分钟异乡日常。",
      category: "world", tags: ["窗景", "旅行", "慢生活", "随机"], filters: ["world", "random"], accent: "paper", size: "tall", symbol: "□"
    },
    {
      id: "nasa-eyes", name: "NASA Eyes", url: "https://eyes.nasa.gov/apps/solar-system/",
      description: "把太阳系放在桌面上，沿探测器的轨道远行。",
      category: "world", tags: ["NASA", "太空", "行星", "科学"], filters: ["world", "study"], accent: "night", size: "wide", symbol: "↗"
    },
    {
      id: "earth-nullschool", name: "Earth Nullschool", url: "https://earth.nullschool.net/",
      description: "看风、洋流与温度在整颗地球上缓慢呼吸。",
      category: "world", tags: ["风场", "洋流", "气象", "可视化"], filters: ["world", "tool"], accent: "blue", size: "standard", symbol: "≈"
    },
    {
      id: "mapcrunch", name: "MapCrunch", url: "https://www.mapcrunch.com/",
      description: "没有机票也没关系，随机扔进一条陌生街道。",
      category: "world", tags: ["街景", "地图", "旅行", "随机"], filters: ["world", "random"], accent: "sand", size: "standard", symbol: "?"
    },

    {
      id: "paper-toilet", name: "Paper Toilet", url: "https://papertoilet.com/",
      description: "如果今天什么都不想干，那就一直撕卷纸。",
      category: "waste", tags: ["解压", "无聊", "奇怪", "小玩具"], filters: ["game", "random"], accent: "paper", size: "tall", symbol: "∞", featured: true
    },
    {
      id: "life-restart", name: "人生重开模拟器", url: "https://liferestart.syaro.io/",
      description: "重来一次未必更好，但至少可以换个天赋。",
      category: "waste", tags: ["游戏", "随机", "人生", "文字"], filters: ["game", "random"], accent: "coral", size: "wide", symbol: "↺"
    },
    {
      id: "paper-games", name: "PaperGames", url: "https://papergames.io/",
      description: "叫上一个人，认真下一盘轻飘飘的棋。",
      category: "waste", tags: ["游戏", "双人", "棋类", "轻量"], filters: ["game"], accent: "green", size: "standard", symbol: "×○"
    },
    {
      id: "little-alchemy", name: "Little Alchemy 2", url: "https://littlealchemy2.com/",
      description: "从水火土气开始，慢慢合成一个荒唐宇宙。",
      category: "waste", tags: ["游戏", "合成", "实验", "脑洞"], filters: ["game"], accent: "sand", size: "tall", symbol: "+"
    },
    {
      id: "pointer-pointer", name: "Pointer Pointer", url: "https://pointerpointer.com/",
      description: "指针停在哪里，就有人恰好指向那里。大概。",
      category: "waste", tags: ["鼠标", "照片", "无聊", "奇怪"], filters: ["game", "random"], accent: "ink", size: "standard", symbol: "☞"
    },
    {
      id: "invisible-cow", name: "Find the Invisible Cow", url: "https://findtheinvisiblecow.com/",
      description: "听着远近提示，寻找一头根本看不见的牛。",
      category: "waste", tags: ["声音", "小游戏", "寻找", "奇怪"], filters: ["game", "sound"], accent: "paper", size: "standard", symbol: "…"
    },

    {
      id: "webfem-pindou", name: "Webfem 拼豆图案", url: "https://webfem.com/tools/pindou/",
      description: "把一张照片变成可以真的拼出来的像素图。",
      category: "create", tags: ["拼豆", "图片转换", "手工", "像素", "DIY", "图像处理"], filters: ["tool", "art"], accent: "pixel", size: "wide", symbol: "▪", featured: true
    },
    {
      id: "photopea", name: "Photopea", url: "https://www.photopea.com/",
      description: "浏览器里的一间修图室，临时救急也足够认真。",
      category: "create", tags: ["图片", "设计", "修图", "PSD", "工具"], filters: ["tool", "art"], accent: "night", size: "tall", symbol: "P"
    },
    {
      id: "shots", name: "Shots", url: "https://shots.so/",
      description: "让一张普通截图，立刻像真的产品展示图。",
      category: "create", tags: ["Mockup", "样机", "设计", "展示", "UI"], filters: ["tool", "art"], accent: "ink", size: "wide", symbol: "▣", cover: "mockup", featured: true, functionKey: "mockup-generator"
    },
    {
      id: "unsplash", name: "Unsplash", url: "https://unsplash.com/",
      description: "缺一张有呼吸感的好照片时，先来这里找。",
      category: "create", tags: ["摄影", "图片", "素材", "设计", "壁纸"], filters: ["art", "tool"], accent: "paper", size: "wide", symbol: "▦", cover: "photos", featured: true, functionKey: "stock-photography"
    },
    {
      id: "autohanding", name: "凹凸工坊", url: "https://www.autohanding.com/",
      description: "把电子文字变成纸面笔迹，只用于创意排版与展示。",
      category: "create", tags: ["手写", "字迹", "PDF", "模拟", "排版"], filters: ["tool", "art"], accent: "sand", size: "wide", symbol: "手", cover: "handwriting", functionKey: "handwriting-simulator"
    },
    {
      id: "thisissand", name: "Thisissand", url: "https://thisissand.com/",
      description: "让彩色砂粒从指间落下，堆一座没有用途的山。",
      category: "create", tags: ["沙画", "绘画", "艺术", "解压"], filters: ["art", "game"], accent: "sand", size: "wide", symbol: "∴"
    },
    {
      id: "patatap", name: "Patatap", url: "https://patatap.com/",
      description: "敲一下键盘，让声音和几何图形同时发生。",
      category: "create", tags: ["声音", "动画", "键盘", "艺术"], filters: ["sound", "art"], accent: "coral", size: "standard", symbol: "A—Z"
    },
    {
      id: "quick-draw", name: "Quick, Draw!", url: "https://quickdraw.withgoogle.com/",
      description: "你随手画几笔，机器猜你到底想画什么。",
      category: "create", tags: ["绘画", "AI", "游戏", "实验"], filters: ["art", "game"], accent: "blue", size: "standard", symbol: "✎"
    },
    {
      id: "chrome-music-lab", name: "Chrome Music Lab", url: "https://musiclab.chromeexperiments.com/",
      description: "不懂乐理也没关系，先让颜色唱起来。",
      category: "create", tags: ["音乐", "实验", "教育", "创作"], filters: ["sound", "art", "study"], accent: "green", size: "tall", symbol: "♪"
    },

    {
      id: "yidanshu", name: "一单书", url: "https://yidanshu.com/",
      description: "书荒的时候，来翻翻别人留下的书单。",
      category: "read", tags: ["读书", "书单", "阅读", "推荐", "电子书", "榜单"], filters: ["study", "tool"], accent: "coral", size: "wide", symbol: "书", featured: true
    },
    {
      id: "gutenberg", name: "Project Gutenberg", url: "https://www.gutenberg.org/",
      description: "七万多本旧书安静开放，不注册也能直接读。",
      category: "read", tags: ["电子书", "经典", "公共领域", "阅读"], filters: ["study"], accent: "paper", size: "tall", symbol: "G"
    },
    {
      id: "internet-archive", name: "Internet Archive", url: "https://archive.org/",
      description: "旧网页、书、声音和影像，在这里继续活着。",
      category: "read", tags: ["档案", "旧网页", "书籍", "历史"], filters: ["study", "tool"], accent: "ink", size: "wide", symbol: "⌛"
    },
    {
      id: "arts-culture", name: "Google Arts & Culture", url: "https://artsandculture.google.com/",
      description: "隔着屏幕走进博物馆，把名画放大到笔触。",
      category: "read", tags: ["博物馆", "艺术", "文化", "展览"], filters: ["art", "study", "world"], accent: "blue", size: "standard", symbol: "◇"
    },
    {
      id: "our-world-data", name: "Our World in Data", url: "https://ourworldindata.org/",
      description: "用诚实的图表，慢慢看清世界怎样变化。",
      category: "read", tags: ["数据", "图表", "世界", "研究"], filters: ["study", "world"], accent: "green", size: "standard", symbol: "↗"
    },

    {
      id: "musclewiki", name: "MuscleWiki", url: "https://musclewiki.com/",
      description: "点一下身体想练的地方，再决定今天练不练。",
      category: "serious", tags: ["健身", "工具", "人体", "训练"], filters: ["tool", "study"], accent: "coral", size: "tall", symbol: "+"
    },
    {
      id: "bilibili-courses", name: "B站网课资源思维导图", url: "https://gitmind.cn/app/docs/mpa0m9v0",
      description: "课程太多不知从哪学，就先从这张图出发。",
      category: "serious", tags: ["学习", "B站", "课程", "思维导图"], filters: ["study", "tool"], accent: "blue", size: "wide", symbol: "→"
    },
    {
      id: "datav-atlas", name: "DataV 地图选择器", url: "https://datav.aliyun.com/portal/school/atlas/area_selector",
      description: "选一个行政区域，把它干净地带走成地图文件。",
      category: "serious", tags: ["地图", "数据", "工具", "SVG", "行政区"], filters: ["tool", "study"], accent: "green", size: "standard", symbol: "⌖"
    },
    {
      id: "wolfram-alpha", name: "Wolfram|Alpha", url: "https://www.wolframalpha.com/",
      description: "把问题写进去，让计算与知识替你认真作答。",
      category: "serious", tags: ["计算", "知识", "数学", "工具"], filters: ["tool", "study"], accent: "coral", size: "wide", symbol: "="
    },
    {
      id: "have-i-been-pwned", name: "Have I Been Pwned", url: "https://haveibeenpwned.com/",
      description: "查查邮箱是否泄露；有些事实早知道更安心。",
      category: "serious", tags: ["安全", "邮箱", "数据泄露", "隐私"], filters: ["tool", "study"], accent: "ink", size: "standard", symbol: "?"
    },
    {
      id: "ten-min-mail", name: "10MinMail", url: "https://www.10-min-mail.com/",
      description: "只想收这一封邮件，不想把真实邮箱留下。",
      category: "serious", tags: ["邮箱", "临时邮箱", "隐私", "注册", "工具"], filters: ["tool"], accent: "blue", size: "wide", symbol: "@", cover: "inbox", functionKey: "temporary-email"
    },
    {
      id: "resume-download", name: "简历下载", url: "https://jianlixiazai.cn/",
      description: "别从空白 Word 开始，先找一份顺眼的简历骨架。",
      category: "serious", tags: ["简历", "模板", "Word", "求职"], filters: ["tool", "study"], accent: "paper", size: "wide", symbol: "CV", cover: "resume", functionKey: "resume-template"
    },
    {
      id: "pdf24", name: "PDF24 Tools", url: "https://tools.pdf24.org/zh/",
      description: "你对 PDF 想做的事，它大概率都能做。",
      category: "serious", tags: ["PDF", "转换", "压缩", "合并", "编辑"], filters: ["tool"], accent: "coral", size: "wide", symbol: "PDF", cover: "pdf", featured: true, functionKey: "pdf-suite"
    },
    {
      id: "deepl", name: "DeepL", url: "https://www.deepl.com/translator",
      description: "不逐字搬运，尽量把一句话翻得仍像一句话。",
      category: "serious", tags: ["翻译", "文档", "多语言", "写作"], filters: ["tool", "study"], accent: "night", size: "wide", symbol: "文", cover: "translate", functionKey: "translator"
    },

    {
      id: "useless-web", name: "The Useless Web", url: "https://theuselessweb.com/",
      description: "摸鱼盲盒的同类替代：一键掉进随机无用网页。",
      category: "weird", tags: ["随机", "摸鱼", "奇怪", "无用网站"], filters: ["random", "game"], accent: "coral", size: "wide", symbol: "???", featured: true
    },
    {
      id: "neal-fun", name: "Neal.fun", url: "https://neal.fun/",
      description: "互联网里那些没必要，但点开就停不下来的东西。",
      category: "weird", tags: ["互动", "小游戏", "数据", "脑洞", "实验"], filters: ["game", "random", "art"], accent: "blue", size: "wide", symbol: "N", cover: "neal", featured: true, functionKey: "interactive-collection"
    },
    {
      id: "radiooooo", name: "Radiooooo", url: "https://app.radiooooo.com/",
      description: "挑一个年代和国家，听一段不属于此刻的歌。",
      category: "weird", tags: ["音乐", "年代", "世界", "地图"], filters: ["sound", "world", "random"], accent: "sand", size: "wide", symbol: "1950"
    },
    {
      id: "soft-murmur", name: "A Soft Murmur", url: "https://asoftmurmur.com/",
      description: "把雨、雷、风和咖啡馆混成自己的背景声。",
      category: "weird", tags: ["白噪音", "声音", "专注", "自然"], filters: ["sound", "tool"], accent: "green", size: "standard", symbol: "≈"
    }
  ];
}());
