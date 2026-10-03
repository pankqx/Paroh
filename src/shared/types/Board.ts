/** A free canvas, stored as `<vault>/boards/<id>.json`. Coordinates are board units (1 = 1px at 100%). */
export interface Board {
  schema_version: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Background: dotted paper, plain, or lined grid. */
  paper?: 'dots' | 'plain' | 'grid';
  items: BoardItem[];
}

export interface BoardSummary {
  id: string;
  title: string;
  updatedAt: string;
  itemCount: number;
  /** A few boxes for the thumbnail on the boards list. */
  preview: { type: BoardItem['type']; x: number; y: number; w: number; h: number; color?: string }[];
}

interface Base {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stacking order is array order; rotation in degrees for stickies' hand-placed look. */
  rotate?: number;
}

export type BoardItem =
  | (Base & { type: 'sticky'; color: string; text: string })
  | (Base & { type: 'text'; color: string; text: string; size: number; serif?: boolean })
  | (Base & { type: 'shape'; shape: 'rect' | 'ellipse' | 'diamond'; fill: string; stroke: string; text: string })
  | (Base & { type: 'draw'; color: string; width: number; points: number[] })
  | (Base & { type: 'arrow'; color: string; /** End point relative to x,y. */ dx: number; dy: number })
  | (Base & { type: 'image'; src: string })
  | (Base & { type: 'checklist'; title: string; color: string; entries: { text: string; done: boolean }[] })
  | (Base & { type: 'frame'; title: string; color: string });

export type BoardItemType = BoardItem['type'];
