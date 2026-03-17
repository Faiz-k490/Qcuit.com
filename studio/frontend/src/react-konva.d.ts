import { ReactNode, Component, RefAttributes } from 'react';
import Konva from 'konva';

declare module 'react-konva' {
  interface StageProps {
    width?: number;
    height?: number;
    children?: ReactNode;
    [key: string]: any;
  }

  interface LayerProps {
    listening?: boolean;
    children?: ReactNode;
    [key: string]: any;
  }

  interface GroupProps {
    x?: number;
    y?: number;
    draggable?: boolean;
    opacity?: number;
    children?: ReactNode;
    onDragStart?: (e: any) => void;
    onDragEnd?: (e: any) => void;
    onDblClick?: (e: any) => void;
    [key: string]: any;
  }

  export class Stage extends Component<StageProps & RefAttributes<Konva.Stage>> {}
  export class Layer extends Component<LayerProps & RefAttributes<Konva.Layer>> {}
  export class Group extends Component<GroupProps & RefAttributes<Konva.Group>> {}
  export class Rect extends Component<any> {}
  export class Text extends Component<any> {}
  export class Line extends Component<any> {}
  export class Circle extends Component<any> {}
}
