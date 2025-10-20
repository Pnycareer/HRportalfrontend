import React from 'react';

export default function FileInput({
  label = 'Profile Picture',
  name = 'avatar',
  value,          // optional, not used for files but kept for API symmetry
  onChange,
  accept = 'image/*',
  required = false,
  containerClassName = '',
}) {
  const [preview, setPreview] = React.useState(null);

  function handleChange(e) {
    const file = e.target.files?.[0] || null;
    if (file && onChange) onChange({ target: { name, files: [file], value: file } });
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    } else {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    }
  }

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <label className="text-sm font-medium">{label}{required ? ' *' : ''}</label>
      <input
        type="file"
        name={name}
        accept={accept}
        onChange={handleChange}
        className="block w-full text-sm file:mr-4 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:opacity-90"
        required={required}
      />
      {preview && (
        <div className="mt-2">
          <img
            src={preview}
            alt="avatar preview"
            className="h-20 w-20 rounded-full object-cover ring-1 ring-border"
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">JPEG/PNG/WebP, max 2MB.</p>
    </div>
  );
}
