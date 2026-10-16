/** One role-play per line: who Ah Tat plays, where, and what you need to get done. */
export interface Scenario {
  unitId: string
  title: string
  /** Shown to the learner and given to Claude. */
  setting: string
  role: string
  /** One character for the role's avatar. */
  avatar: string
  goal: string
  /** Ah Tat's first line (no API call needed to start). */
  opener: { zh: string; en: string }
}

export const SCENARIOS: Scenario[] = [
  {
    unitId: 'u01',
    title: 'New colleague',
    setting: 'First day at a new job in a Singapore office pantry.',
    role: 'a friendly colleague called Jia Hui',
    avatar: '慧',
    goal: 'Introduce yourself: your name, what you do, and where you live.',
    opener: { zh: '你好！你是新来的吗？我叫佳慧。', en: "Hi! Are you new? I'm Jia Hui." },
  },
  {
    unitId: 'u02',
    title: 'Mama shop',
    setting: 'A small provision shop at the bottom of an HDB block.',
    role: 'the uncle who runs the shop',
    avatar: '叔',
    goal: 'Buy two things, ask how much they cost, and pay.',
    opener: { zh: '要买什么？慢慢看啦。', en: 'What do you want to buy? Take your time.' },
  },
  {
    unitId: 'u03',
    title: 'Kopitiam order',
    setting: 'A busy kopitiam in the morning.',
    role: 'the drinks stall auntie',
    avatar: '姨',
    goal: 'Order a drink the way you like it (e.g. kopi-O siew dai) and say if it is to take away.',
    opener: { zh: '早！要喝什么？', en: 'Morning! What would you like to drink?' },
  },
  {
    unitId: 'u04',
    title: 'Taxi ride',
    setting: 'You have just got into a taxi.',
    role: 'a chatty taxi uncle',
    avatar: '叔',
    goal: 'Tell him where you are going, ask how long it takes, and how to pay.',
    opener: { zh: '你好，去哪里？', en: 'Hello, where to?' },
  },
  {
    unitId: 'u05',
    title: 'Void deck chat',
    setting: 'At the void deck of your HDB block, waiting for the lift.',
    role: 'your neighbour auntie from the same floor',
    avatar: '姨',
    goal: 'Make small talk about the weather and the lift, then say goodbye.',
    opener: { zh: '哎呀，今天很热哦！你刚回来吗？', en: 'Aiyo, so hot today! Just got back?' },
  },
  {
    unitId: 'u06',
    title: 'Family dinner',
    setting: 'A family dinner at your grandmother’s flat.',
    role: 'your talkative aunt',
    avatar: '姨',
    goal: 'Answer her questions about work and family, and ask about her children.',
    opener: { zh: '好久不见！最近工作忙不忙？', en: 'Long time no see! Busy at work lately?' },
  },
  {
    unitId: 'u07',
    title: 'Calling in sick',
    setting: 'You phone your manager in the morning.',
    role: 'your manager',
    avatar: '经',
    goal: 'Say you are not well, that you saw a doctor and have an MC, and ask to move a meeting.',
    opener: { zh: '喂，早安。有什么事吗？', en: 'Hello, good morning. What’s up?' },
  },
  {
    unitId: 'u08',
    title: 'NS buddy',
    setting: 'Meeting an old NS buddy at a hawker centre.',
    role: 'your old army friend',
    avatar: '兵',
    goal: 'Catch up: what you do now, and plan to meet again.',
    opener: { zh: '哇，是你啊！好久不见！最近怎样？', en: "Wah, it's you! Long time no see! How are things?" },
  },
  {
    unitId: 'u09',
    title: 'CNY visiting',
    setting: 'Visiting relatives on the first day of Chinese New Year.',
    role: 'your grand-aunt',
    avatar: '嫲',
    goal: 'Give New Year greetings, accept the oranges and ang bao politely, and answer a question.',
    opener: { zh: '来来来，新年快乐！吃饭了吗？', en: 'Come in, come in, Happy New Year! Have you eaten?' },
  },
  {
    unitId: 'u10',
    title: 'Kaki chat',
    setting: 'Texting a close friend about weekend plans.',
    role: 'your friend who speaks very colloquially',
    avatar: '友',
    goal: 'Agree on a plan for the weekend, using a few lah / lor / meh.',
    opener: { zh: '喂，这个周末有空吗？出来吃东西啦！', en: 'Oi, free this weekend? Come out and eat lah!' },
  },
  {
    unitId: 'u11',
    title: 'What to makan',
    setting: 'At a hawker centre deciding what to eat with a friend.',
    role: 'your hungry friend',
    avatar: '友',
    goal: 'Decide what to eat and drink, and chope a table.',
    opener: { zh: '饿死了！我们吃什么好呢？', en: "I'm starving! What shall we eat?" },
  },
  {
    unitId: 'u12',
    title: 'Polyclinic counter',
    setting: 'At the polyclinic registration counter.',
    role: 'the counter staff',
    avatar: '护',
    goal: 'Register: give your name and IC, say what is wrong, and ask how long the wait is.',
    opener: { zh: '你好，请问看什么？有带 IC 吗？', en: "Hello, what are you here for? Did you bring your IC?" },
  },
  {
    unitId: 'u13',
    title: 'Kopitiam gossip',
    setting: 'Sitting with an uncle at the kopitiam who loves to gossip.',
    role: 'a kaypoh kopitiam uncle',
    avatar: '叔',
    goal: 'Chat about the neighbourhood and politely get away when you need to go.',
    opener: { zh: '哎，你知道吗？楼下那家店要关了！', en: 'Eh, you know or not? The shop downstairs is closing!' },
  },
  {
    unitId: 'u14',
    title: 'Lost tourist',
    setting: 'At an MRT station, a tourist from China asks you for help.',
    role: 'a tourist visiting Singapore',
    avatar: '客',
    goal: 'Tell them which line and station to take to Gardens by the Bay, and recommend one place to eat.',
    opener: { zh: '不好意思，请问滨海湾花园怎么去？', en: 'Excuse me, how do I get to Gardens by the Bay?' },
  },
]

export const scenarioFor = (unitId: string) => SCENARIOS.find((s) => s.unitId === unitId)
