import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { SuggestionList, type SuggestionItem, type SuggestionListHandle } from './SuggestionList';

export function renderSuggestion(empty: string): SuggestionOptions<SuggestionItem, SuggestionItem>['render'] {
  return () => {
    let component: ReactRenderer<SuggestionListHandle> | undefined;
    let unmount: (() => void) | undefined;
    return {
      onStart: (props) => {
        component = new ReactRenderer(SuggestionList, { props: { items: props.items, command: props.command, empty }, editor: props.editor });
        unmount = props.mount(component.element as HTMLElement);
      },
      onUpdate: (props) => component?.updateProps({ items: props.items, command: props.command, empty }),
      onKeyDown: ({ event }) => {
        if (event.key === 'Escape') {
          unmount?.();
          unmount = undefined;
          return true;
        }
        return component?.ref?.onKeyDown(event) ?? false;
      },
      onExit: () => {
        unmount?.();
        component?.destroy();
      },
    };
  };
}
