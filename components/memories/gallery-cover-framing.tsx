"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { coverImageStyle } from "@/lib/memories-core";
import g from "./gallery-editor.module.css";
export type CoverFrame = {
  cover_photo_id: string | null;
  cover_offset_x: number;
  cover_offset_y: number;
  cover_zoom: number;
};
const clamp = (n: number) => Math.min(200, Math.max(-200, Math.round(n)));
export default function GalleryCoverFraming({
  imageUrl,
  value,
  onChange,
  disabled,
}: {
  imageUrl: string;
  value: CoverFrame;
  onChange: (value: CoverFrame) => void;
  disabled: boolean;
}) {
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    value: CoverFrame;
  } | null>(null);
  return (
    <div className={g.framing}>
      <div
        className={g.framePreview}
        aria-label="Cover preview"
        onPointerDown={(e) => {
          if (disabled || e.button !== 0 || drag.current) return;
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, value };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start || start.id !== e.pointerId) return;
          const box = e.currentTarget.getBoundingClientRect();
          onChange({
            ...value,
            cover_offset_x: clamp(
              start.value.cover_offset_x +
                ((e.clientX - start.x) / box.width) * 100,
            ),
            cover_offset_y: clamp(
              start.value.cover_offset_y +
                ((e.clientY - start.y) / box.height) * 100,
            ),
          });
        }}
        onPointerUp={(e) => {
          if (drag.current?.id === e.pointerId) drag.current = null;
        }}
        onPointerCancel={(e) => {
          if (drag.current?.id === e.pointerId) {
            onChange(drag.current.value);
            drag.current = null;
          }
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        <img
          draggable={false}
          src={imageUrl}
          alt="Selected album cover preview"
          style={coverImageStyle(value)}
        />
      </div>
      <p>
        Drag the preview to position the image. This is the same 4:3 frame used
        on the Gallery card.
      </p>
      <label>
        Size <output>{value.cover_zoom}%</output>
        <input
          aria-label="Cover size"
          type="range"
          min={20}
          max={400}
          step={1}
          disabled={disabled}
          value={value.cover_zoom}
          onChange={(e) =>
            onChange({ ...value, cover_zoom: Number(e.target.value) })
          }
        />
      </label>
      <div className={g.framePositions}>
        <label>
          Horizontal position
          <input
            aria-label="Cover horizontal position"
            type="number"
            min={-200}
            max={200}
            disabled={disabled}
            value={value.cover_offset_x}
            onChange={(e) =>
              onChange({
                ...value,
                cover_offset_x: clamp(Number(e.target.value)),
              })
            }
          />
        </label>
        <label>
          Vertical position
          <input
            aria-label="Cover vertical position"
            type="number"
            min={-200}
            max={200}
            disabled={disabled}
            value={value.cover_offset_y}
            onChange={(e) =>
              onChange({
                ...value,
                cover_offset_y: clamp(Number(e.target.value)),
              })
            }
          />
        </label>
      </div>
      <button
        disabled={disabled}
        onClick={() =>
          onChange({
            ...value,
            cover_offset_x: 0,
            cover_offset_y: 0,
            cover_zoom: 100,
          })
        }
      >
        Reset framing
      </button>
    </div>
  );
}
