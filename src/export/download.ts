/** Hand a generated file to the browser as a download. */
export function downloadFile(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before freeing the data
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
