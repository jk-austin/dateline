import { useState } from 'react'

function App() {
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

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
  }

  function updateResult(index, updates) {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

async function downloadAll() {
  try {
    const done = results.filter(r => r.status === 'done')
    console.log('Files to zip:', done.length)
    
    const fileData = await Promise.all(
      done.map(async (result) => {
        const file = files[results.indexOf(result)]
        console.log('Processing file:', result.filename, 'file object:', file)
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

    console.log('Sending to backend...')
    const response = await fetch('http://localhost:3000/download-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: fileData })
    })

    console.log('Response status:', response.status)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dateline-export.zip'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Download all error:', err)
  }
}

  async function processFiles() {
    setLoading(true)

    for (let i = 0; i < files.length; i++) {
      updateResult(i, { status: 'processing' })

      const formData = new FormData()
      formData.append('pdf', files[i])

      try {
        const response = await fetch('http://localhost:3000/upload', {
          method: 'POST',
          body: formData
        })
        const data = await response.json()

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

  async function retryFailed() {
    const failedIndexes = results
      .map((r, i) => r.status === 'failed' ? i : null)
      .filter(i => i !== null)

    for (const i of failedIndexes) {
      updateResult(i, { status: 'processing', error: null })

      const formData = new FormData()
      formData.append('pdf', files[i])

      try {
        const response = await fetch('http://localhost:3000/upload', {
          method: 'POST',
          body: formData
        })
        const data = await response.json()

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

      if (i < failedIndexes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  const failedCount = results.filter(r => r.status === 'failed').length
  const doneCount = results.filter(r => r.status === 'done').length

  const statusColor = {
    pending: 'text-gray-400',
    processing: 'text-blue-500',
    done: 'text-green-600',
    failed: 'text-red-500'
  }

  const statusLabel = {
    pending: 'Pending',
    processing: 'Processing...',
    done: 'Done',
    failed: 'Failed'
  }

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