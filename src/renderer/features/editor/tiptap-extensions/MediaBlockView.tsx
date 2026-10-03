import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { Columns2, Maximize2, RectangleHorizontal, Trash2 } from 'lucide-react';
import { mediaType } from '../../../../shared/media';
import { useMediaUrl } from '../../../hooks/useMediaUrl';
import type { MediaWidth } from './mediaBlock';

const SIZES: { width: MediaWidth; label: string; Icon: typeof Columns2 }[] = [
  { width: 'normal', label: 'Text width', Icon: Columns2 },
  { width: 'wide', label: 'Wide', Icon: RectangleHorizontal },
  { width: 'full', label: 'Full width', Icon: Maximize2 },
];

export function MediaBlockView({ node, updateAttributes, deleteNode, selected, editor }: ReactNodeViewProps) {
  const { src, caption, width } = node.attrs as { src: string; caption: string; width: MediaWidth };
  const kind = mediaType(src)?.kind ?? 'image';
  const { url, error } = useMediaUrl(src);
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper as="figure" className={`media-block media-${kind} media-${width} ${selected ? 'selected' : ''}`} data-drag-handle="">
      {editable && kind !== 'audio' && (
        <div className="media-tools" contentEditable={false}>
          {SIZES.map(({ width: w, label, Icon }) => (
            <button key={w} type="button" className={`media-tool ${width === w ? 'on' : ''}`} aria-label={label} title={label} aria-pressed={width === w} onClick={() => updateAttributes({ width: w })}>
              <Icon size={15} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="media-tool" aria-label="Remove from page" title="Remove from page" onClick={deleteNode}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="media-frame" contentEditable={false}>
        {error ? (
          <div className="media-missing">{error}</div>
        ) : !url ? (
          <div className="media-loading" aria-label="Loading" />
        ) : kind === 'video' ? (
          <video src={url} controls playsInline preload="metadata" aria-label={caption || 'Video'} />
        ) : kind === 'audio' ? (
          <div className="media-audio">
            <span className="media-audio-icon" aria-hidden="true">
              ♪
            </span>
            <audio src={url} controls aria-label={caption || 'Voice note'} />
            {editable && (
              <button type="button" className="media-tool" aria-label="Remove from page" title="Remove from page" onClick={deleteNode}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <img src={url} alt={caption || ''} draggable={false} />
        )}
      </div>
      {editable ? (
        <input
          className="media-caption"
          value={caption}
          placeholder={kind === 'audio' ? 'Name this voice note' : 'Add a caption'}
          aria-label="Caption"
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor.commands.focus();
            }
          }}
        />
      ) : (
        caption && <figcaption className="media-caption">{caption}</figcaption>
      )}
    </NodeViewWrapper>
  );
}
