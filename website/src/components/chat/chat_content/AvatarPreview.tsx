interface AvatarPreviewProps {
  src: string;
  alt?: string;
  size?: number;
  onClick?: () => void;
}

export default function AvatarPreview({
  src,
  alt = "avatar",
  size = 40,
  onClick,
}: AvatarPreviewProps) {
  return (
    <button
      type="button"
      className="focus:outline-none bg-transparent p-0 border-0"
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClick}
      tabIndex={0}
    >
      <img
        src={src}
        alt={alt}
        className="rounded-full object-cover shadow border border-white"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        loading="lazy"
        draggable={false}
      />
    </button>
  );
}
