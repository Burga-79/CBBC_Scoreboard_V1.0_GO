package main

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
)

// ------------------------------------------------------------
// Utility: open browser windows
// ------------------------------------------------------------
func openBrowser(url string) {
    var cmd string
    var args []string

    switch runtime.GOOS {
    case "windows":
        cmd = "rundll32"
        args = []string{"url.dll,FileProtocolHandler", url}
    case "darwin":
        cmd = "open"
        args = []string{url}
    default:
        cmd = "xdg-open"
        args = []string{url}
    }

    exec.Command(cmd, args...).Start()
}

// ------------------------------------------------------------
// JSON save/load handlers
// ------------------------------------------------------------
func saveHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "POST only", http.StatusMethodNotAllowed)
        return
    }

    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Cannot read body", 500)
        return
    }

    err = os.WriteFile("./data/state.json", body, 0644)
    if err != nil {
        http.Error(w, "Cannot write file", 500)
        return
    }

    w.Write([]byte("OK"))
}

func loadHandler(w http.ResponseWriter, r *http.Request) {
    data, err := os.ReadFile("./data/state.json")
    if err != nil {
        w.Write([]byte("{}"))
        return
    }
    w.Write(data)
}

// ------------------------------------------------------------
// Image upload handler
// ------------------------------------------------------------
func uploadHandler(w http.ResponseWriter, r *http.Request) {
    r.ParseMultipartForm(20 << 20) // 20MB

    file, handler, err := r.FormFile("image")
    if err != nil {
        http.Error(w, "Upload error", 500)
        return
    }
    defer file.Close()

    dstPath := filepath.Join("images", handler.Filename)
    dst, err := os.Create(dstPath)
    if err != nil {
        http.Error(w, "Cannot save file", 500)
        return
    }
    defer dst.Close()

    io.Copy(dst, file)
    w.Write([]byte("OK"))
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
func main() {
    // Ensure folders exist
    os.MkdirAll("data", 0755)
    os.MkdirAll("images", 0755)

    // Static file servers
    http.Handle("/", http.FileServer(http.Dir("./admin")))
    http.Handle("/display/", http.StripPrefix("/display/", http.FileServer(http.Dir("./display"))))
    http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("./images"))))

    // API routes
    http.HandleFunc("/api/save", saveHandler)
    http.HandleFunc("/api/load", loadHandler)
    http.HandleFunc("/api/upload", uploadHandler)

    // Open browser windows
    go openBrowser("http://localhost:3000")
    go openBrowser("http://localhost:3000/display")

    fmt.Println("Scoreboard server running on http://localhost:3000")
    log.Fatal(http.ListenAndServe(":3000", nil))
}
