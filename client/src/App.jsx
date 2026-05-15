import { useState } from 'react'

function App() {
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  async function processFiles() {
  setLoading(true)
  const processed = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('pdf', file)

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      const blob = new Blob([file], { type: 'application/pdf' })
      const downloadUrl = URL.createObjectURL(blob)
      processed.push({ ...data, downloadUrl })
    } catch (err) {
      processed.push({ filename: file.name, error: err.message, source: 'error' })
    }
  }

  setResults(processed)
  setLoading(false)
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
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="block w-full text-sm text-gray-500 mb-4"
          />
          <button
            onClick={processFiles}
            disabled={files.length === 0 || loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? 'Processing...' : `Process ${files.length} file(s)`}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Results</h2>
            <ul className="space-y-3">
              {results.map((result, i) => (
                <li key={i} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium text-gray-800">{result.filename}</p>
                    <p className="text-xs text-gray-400">via {result.source}</p>
                  </div>
                  <a
                    href={result.downloadUrl}
                    download={result.filename}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Download
                  </a>
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