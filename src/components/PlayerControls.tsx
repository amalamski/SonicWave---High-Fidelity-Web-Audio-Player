// Намери секцията със <select> за Spatial Audio и я замени с това:
<select
  disabled={!isSpatialLoaded}
  value={spatialMode}
  onChange={(e) => onSpatialModeChange(e.target.value as SpatialMode)}
  className={cn(
    "text-xs bg-transparent focus:outline-none cursor-pointer font-medium transition-colors",
    !isSpatialLoaded ? "text-gray-500" :
    spatialMode !== 'off' ? "text-purple-400" : "text-gray-300"
  )}
>
  <option value="off" className="bg-gray-800 text-white">
    {!isSpatialLoaded ? 'Loading...' : 'Normal (Off)'}
  </option>
  {isSpatialLoaded && (
    <>
      <option value="headphones" className="bg-gray-800 text-white">🎧 Headphones</option>
      <option value="speakers" className="bg-gray-800 text-white">💻 Speakers</option>
    </>
  )}
</select>