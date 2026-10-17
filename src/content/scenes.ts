import sizes from './scenes.sizes.json'

/** x, y, width, height as percentages of the scene image. */
export type Box = [number, number, number, number]
export interface Hotspot {
  /** A course word for the object (usually from the scene's own line). */
  itemId: string
  box: Box
}

/** Always-on touches drawn over the picture: rising steam, a warm glow or a twinkle, at x, y (%). */
export interface Ambient {
  kind: 'steam' | 'glow' | 'shimmer'
  at: [number, number]
}

export interface Scene {
  unitId: string
  src: string
  width: number
  height: number
  hotspots: Hotspot[]
  ambient: Ambient[]
}

/** One illustrated scene per MRT line (art: public/scenes, built by art/scenes/build.py). */
const SCENES: Record<string, Omit<Scene, 'unitId' | 'src' | 'width' | 'height'>> = {
  // shophouse reading nook
  u01: {
    hotspots: [
      { itemId: 'kan', box: [33, 62, 26, 18] },
      { itemId: 'zaoshang', box: [44, 4, 42, 52] },
      { itemId: 'qing', box: [65, 66, 24, 24] },
    ],
    ambient: [{ kind: 'glow', at: [64, 30] }],
  },
  // provision shop checkout
  u02: {
    hotspots: [
      { itemId: 'dian', box: [75, 14, 18, 28] },
      { itemId: 'fuqian', box: [62, 36, 27, 26] },
      { itemId: 'xianjin', box: [32, 47, 22, 12] },
      { itemId: 'dazhe', box: [81, 57, 19, 35] },
    ],
    ambient: [],
  },
  // kopitiam corner
  u03: {
    hotspots: [
      { itemId: 'kafei', box: [47, 52, 15, 11] },
      { itemId: 'kaye', box: [58, 57, 23, 12] },
      { itemId: 'chaoguotiao', box: [39, 37, 26, 13] },
      { itemId: 'bawei', box: [12, 75, 22, 24] },
    ],
    ambient: [
      { kind: 'steam', at: [51, 31] },
      { kind: 'steam', at: [55, 51] },
    ],
  },
  // bus stop
  u04: {
    hotspots: [
      { itemId: 'bashi', box: [49, 30, 51, 53] },
      { itemId: 'bashizhan', box: [20, 30, 22, 50] },
      { itemId: 'chidao', box: [33, 57, 17, 16] },
    ],
    ambient: [],
  },
  // HDB home entrance
  u05: {
    hotspots: [
      { itemId: 'yaoshi', box: [52, 38, 14, 16] },
      { itemId: 'zoulang', box: [78, 2, 22, 96] },
      { itemId: 'jia', box: [24, 60, 26, 32] },
      { itemId: 'tianqi', box: [25, 13, 22, 40] },
    ],
    ambient: [],
  },
  // family dining corner
  u06: {
    hotspots: [
      { itemId: 'jucan', box: [36, 30, 40, 28] },
      { itemId: 'baba', box: [0, 30, 30, 62] },
      { itemId: 'haizi', box: [31, 52, 28, 44] },
      { itemId: 'xiangnian', box: [61, 3, 15, 22] },
    ],
    ambient: [
      { kind: 'steam', at: [56, 33] },
      { kind: 'steam', at: [66, 37] },
    ],
  },
  // desk with kopi and errands
  u07: {
    hotspots: [
      { itemId: 'gongzuo', box: [26, 25, 38, 20] },
      { itemId: 'jiaban', box: [58, 2, 13, 22] },
      { itemId: 'kaihui', box: [5, 32, 24, 19] },
      { itemId: 'wanggou', box: [63, 35, 32, 46] },
    ],
    ambient: [{ kind: 'steam', at: [64, 3] }],
  },
  // school bag and NS gear
  u08: {
    hotspots: [
      { itemId: 'xuesheng', box: [8, 0, 33, 52] },
      { itemId: 'gongke', box: [5, 50, 36, 26] },
      { itemId: 'xiezi', box: [38, 33, 10, 22] },
      { itemId: 'dangbing', box: [46, 8, 32, 64] },
    ],
    ambient: [],
  },
  // festive lantern, ketupat and diya
  u09: {
    hotspots: [
      { itemId: 'denglong', box: [52, 0, 28, 58] },
      { itemId: 'kaizhaijie', box: [20, 15, 40, 55] },
      { itemId: 'tuyaojie', box: [64, 50, 27, 26] },
      { itemId: 'zhufu', box: [35, 82, 30, 14] },
    ],
    ambient: [
      { kind: 'glow', at: [76, 60] },
    ],
  },
  // chat corner with jade benches
  u10: {
    hotspots: [
      { itemId: 'la-particle', box: [13, 8, 30, 30] },
      { itemId: 'lo-particle', box: [38, 32, 22, 25] },
      { itemId: 'suibian', box: [5, 48, 36, 50] },
      { itemId: 'shuang', box: [55, 48, 38, 50] },
    ],
    ambient: [],
  },
  // hawker table spread
  u11: {
    hotspots: [
      { itemId: 'lacha', box: [14, 0, 22, 42] },
      { itemId: 'laksa', box: [40, 5, 39, 38] },
      { itemId: 'jifan', box: [0, 38, 48, 32] },
      { itemId: 'shadie', box: [52, 44, 47, 26] },
    ],
    ambient: [{ kind: 'steam', at: [58, 7] }],
  },
  // HDB block and dragon playground
  u12: {
    hotspots: [
      { itemId: 'zuwuqu', box: [62, 0, 38, 75] },
      { itemId: 'haizi', box: [30, 42, 35, 52] },
      { itemId: 're', box: [0, 0, 32, 60] },
    ],
    ambient: [],
  },
  // kopitiam conversation corner
  u13: {
    hotspots: [
      { itemId: 'yinsheng', box: [32, 28, 36, 12] },
      { itemId: 'jipo', box: [28, 0, 50, 20] },
      { itemId: 'toujia', box: [41, 8, 17, 22] },
      { itemId: 'chishe', box: [18, 52, 22, 46] },
    ],
    ambient: [
      { kind: 'steam', at: [37, 27] },
      { kind: 'steam', at: [61, 27] },
    ],
  },
  // Merlion, Marina Bay Sands and the Supertrees
  u14: {
    hotspots: [
      { itemId: 'yuweishi', box: [3, 0, 28, 70] },
      { itemId: 'shicheng', box: [40, 14, 36, 56] },
      { itemId: 'binhaiwanhuayuan', box: [74, 10, 26, 58] },
      { itemId: 'xinshengshui', box: [30, 72, 62, 22] },
    ],
    ambient: [
      { kind: 'shimmer', at: [33, 45] },
      { kind: 'shimmer', at: [60, 84] },
    ],
  },
}

export const scenes: Record<string, Scene> = Object.fromEntries(
  Object.entries(SCENES).map(([unitId, s]) => {
    const [width, height] = (sizes as Record<string, number[]>)[unitId]
    return [unitId, { ...s, unitId, src: `scenes/${unitId}.webp`, width, height }]
  }),
)

export const sceneFor = (unitId: string): Scene | undefined => scenes[unitId]
