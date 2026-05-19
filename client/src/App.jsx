import { useState } from 'react'
const API_URL = 'https://dateline-production.up.railway.app'

// Main application component
function App() {
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  // Handle file selection
  function handleFileChange(e) {
    const selected = Array.from(e.target.files)
    setResults(selected.map(file => ({
      originalName: file.name,
      filename: null,
      source: null,
      downloadUrl: null,
      status: 'pending',
      error: null
    })))
    setFiles(selected)
    setDownloadError(null)
  }

  // Helper function to update a specific result by index
  function updateResult(index, updates) {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

// Function to call the backend API to download all files as a zip
async function downloadAll() {
  try {
    // Filter results to only include successfully processed files
    const done = results.filter(r => r.status === 'done')
    
    // Convert each file to base64 and prepare the payload for the backend
    const fileData = await Promise.all(
      done.map(async (result) => {
        const file = files[results.indexOf(result)]
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let j = 0; j < bytes.byteLength; j++) {
          binary += String.fromCharCode(bytes[j])
        }
        const base64 = btoa(binary)
        return { filename: result.filename, data: base64 }
      })
    )

    // Call the backend API to create the zip file
    const response = await fetch(`${API_URL}/download-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: fileData })
    })

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dateline-export.zip'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Download all error:', err)
    setDownloadError('Download failed: ' + err.message)
  }
}

  // Function to process each file by sending it to the backend API
  async function processFiles() {
    setLoading(true)

    for (let i = 0; i < files.length; i++) {
      updateResult(i, { status: 'processing' })

      const formData = new FormData()
      formData.append('pdf', files[i])

      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        })
        const data = await response.json()
        
        // Update the result based on the API response
        if (data.error) {
          updateResult(i, { status: 'failed', error: data.error })
        } else {
          const blob = new Blob([files[i]], { type: 'application/pdf' })
          const downloadUrl = URL.createObjectURL(blob)
          updateResult(i, {
            status: 'done',
            filename: data.filename,
            source: data.source,
            downloadUrl
          })
        }
      } catch (err) {
        updateResult(i, { status: 'failed', error: err.message })
      }

      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setLoading(false)
  }
  // Function to retry failed files
  async function retryFailed() {
    const failedIndexes = results
      .map((r, i) => r.status === 'failed' ? i : null)
      .filter(i => i !== null)
    // Process each failed file again
    for (const i of failedIndexes) {
      updateResult(i, { status: 'processing', error: null })
      // Create a new FormData object for the file
      const formData = new FormData()
      formData.append('pdf', files[i])
      // Call the backend API to process the file
      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        })
        const data = await response.json()
        // Update the result based on the API response
        if (data.error) {
          updateResult(i, { status: 'failed', error: data.error })
        } else {
          const blob = new Blob([files[i]], { type: 'application/pdf' })
          const downloadUrl = URL.createObjectURL(blob)
          updateResult(i, {
            status: 'done',
            filename: data.filename,
            source: data.source,
            downloadUrl
          })
        }
      } catch (err) {
        updateResult(i, { status: 'failed', error: err.message })
      }
      // Add a short delay between retries to avoid overwhelming the backend
      if (i < failedIndexes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
  // Calculate counts of failed and done files for UI display
  const failedCount = results.filter(r => r.status === 'failed').length
  const doneCount = results.filter(r => r.status === 'done').length
  // Define status colors and labels for UI display
  const statusColor = {
    pending: 'text-gray-400',
    processing: 'text-blue-500',
    done: 'text-green-600',
    failed: 'text-red-500'
  }
  // Define human-readable labels for each status
  const statusLabel = {
    pending: 'Pending',
    processing: 'Processing...',
    done: 'Done',
    failed: 'Failed'
  }
  // Render the main application UI
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dateline</h1>
        <p className="text-gray-500 mb-8">Lancaster Farming PDF renaming tool</p>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={processFiles}
              disabled={files.length === 0 || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700"
            >
              {loading ? `Processing ${doneCount} of ${files.length}...` : `Process ${files.length} file(s)`}
            </button>
            {doneCount > 0 && !loading && (
            <button
              onClick={downloadAll}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Download All ({doneCount})
            </button>
            )}
            {failedCount > 0 && !loading && (
              <button
                onClick={retryFailed}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
              >
                Retry {failedCount} failed
              </button>
            )}
          </div>
          {downloadError && (
            <p className="text-red-500 text-sm mt-3">{downloadError}</p>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Results — {doneCount} of {results.length} complete
            </h2>
            <ul className="space-y-3">
              {results.map((result, i) => (
                <li key={i} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{result.originalName}</p>
                    <p className="font-medium text-gray-800">
                      {result.filename || '—'}
                    </p>
                    {result.source && (
                      <p className="text-xs text-gray-400">via {result.source}</p>
                    )}
                    {result.error && (
                      <p className="text-xs text-red-400">{result.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${statusColor[result.status]}`}>
                      {statusLabel[result.status]}
                    </span>
                    {result.status === 'done' && (
                      <a
                        href={result.downloadUrl}
                        download={result.filename}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default App