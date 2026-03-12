package main

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "mime/multipart"
    "net/http"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "time"
)

const (
    dataDir   = "data"
    imagesDir = "images"
)

type jsonAny = map[string]interface{}

func main() {
    // Ensure base folders exist
    mustMkdir(dataDir)
    mustMkdir(imagesDir)
    mustMkdir(filepath.Join(imagesDir, "sponsors"))
    mustMkdir(filepath.Join(imagesDir, "backgrounds"))
    mustMkdir(filepath.Join(imagesDir, "logo"))

    // API routes (JSON storage)
    http.HandleFunc("/api/teams", handleJSONArray("teams.json"))
    http.HandleFunc("/api/results", handleJSONArray("results.json"))
    http.HandleFunc("/api/sponsors", handleJSONArray("sponsors.json"))
    http.HandleFunc("/api/backgrounds", handleJSONArray("backgrounds.json"))
    http.HandleFunc("/api/logo", handleJSONObject("logo.json"))
    http.HandleFunc("/api/scoring", handleJSONObject("scoring.json"))
    http.HandleFunc("/api/theme", handleJSONObject("theme.json"))
    http.HandleFunc("/api/contentTheme", handleJSONObject("contentTheme.json"))
    http.HandleFunc("/api/displayStyle", handleJSONObject("displayStyle.json"))
    http.HandleFunc("/api/sponsorSpeed", handleJSONObject("sponsorSpeed.json"))

    // Upload endpoints
    http.HandleFunc("/api/upload/sponsor", handleUpload("sponsors"))
    http.HandleFunc("/api/upload/background", handleUpload("backgrounds"))
    http.HandleFunc("/api/upload/logo", handleUpload("logo"))

    // Reset event (teams + results only)
    http.HandleFunc("/api/resetEvent", handleResetEvent)

    // Admin entry point
    http.HandleFunc("/admin", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, filepath.Join("admin", "index.html"))
    })

    // Display entry point (redirect /display → /display/display.html)
http.HandleFunc("/display", func(w http.ResponseWriter, r *http.Request) {
    http.Redirect(w, r, "/display/display.html", http.StatusFound)
})

    // Static file servers
    http.Handle("/admin/", http.StripPrefix("/admin/", http.FileServer(http.Dir("admin"))))
    http.Handle("/display/", http.StripPrefix("/display/", http.FileServer(http.Dir("display"))))
    http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("images"))))

    addr := ":3000"
    log.Printf("Scoreboard server running at %s\n", addr)

    // Auto-open browser windows
    go func() {
        time.Sleep(800 * time.Millisecond)
        openBrowser("http://localhost:3000/admin")
        time.Sleep(400 * time.Millisecond)
        openBrowser("http://localhost:3000/display")
    }()

    if err := http.ListenAndServe(addr, nil); err != nil {
        log.Fatal(err)
    }
}

//
// ────────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────────
//

func mustMkdir(path string) {
    if err := os.MkdirAll(path, 0755); err != nil {
        log.Fatalf("failed to create dir %s: %v", path, err)
    }
}

func dataPath(name string) string {
    return filepath.Join(dataDir, name)
}

func readJSONFile(path string, v interface{}, defaultValue interface{}) error {
    f, err := os.Open(path)
    if err != nil {
        if os.IsNotExist(err) && defaultValue != nil {
            if err := writeJSONFile(path, defaultValue); err != nil {
                return err
            }
            b, _ := json.Marshal(defaultValue)
            return json.Unmarshal(b, v)
        }
        return err
    }
    defer f.Close()

    dec := json.NewDecoder(f)
    return dec.Decode(v)
}

func writeJSONFile(path string, v interface{}) error {
    tmp := path + ".tmp"
    f, err := os.Create(tmp)
    if err != nil {
        return err
    }

    enc := json.NewEncoder(f)
    enc.SetIndent("", "  ")
    if err := enc.Encode(v); err != nil {
        f.Close()
        return err
    }

    if err := f.Close(); err != nil {
        return err
    }

    return os.Rename(tmp, path)
}

//
// ────────────────────────────────────────────────────────────────
//  JSON ARRAY HANDLER (teams, results, sponsors, backgrounds)
// ────────────────────────────────────────────────────────────────
//

func handleJSONArray(fileName string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        path := dataPath(fileName)

        switch r.Method {
        case http.MethodGet:
            var arr []jsonAny
            if err := readJSONFile(path, &arr, []jsonAny{}); err != nil {
                http.Error(w, "failed to read data", http.StatusInternalServerError)
                return
            }
            writeJSONResponse(w, arr)

        case http.MethodPost:
            var arr []jsonAny
            if err := json.NewDecoder(r.Body).Decode(&arr); err != nil {
                http.Error(w, "invalid JSON", http.StatusBadRequest)
                return
            }
            if err := writeJSONFile(path, arr); err != nil {
                http.Error(w, "failed to write data", http.StatusInternalServerError)
                return
            }
            writeJSONResponse(w, map[string]string{"status": "ok"})

        default:
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        }
    }
}

//
// ────────────────────────────────────────────────────────────────
//  JSON OBJECT HANDLER (logo, scoring, theme, displayStyle, sponsorSpeed)
// ────────────────────────────────────────────────────────────────
//

func handleJSONObject(fileName string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        path := dataPath(fileName)

        switch r.Method {
        case http.MethodGet:
            var obj jsonAny
            if err := readJSONFile(path, &obj, jsonAny{}); err != nil {
                http.Error(w, "failed to read data", http.StatusInternalServerError)
                return
            }
            writeJSONResponse(w, obj)

        case http.MethodPost:
            var obj jsonAny
            if err := json.NewDecoder(r.Body).Decode(&obj); err != nil {
                http.Error(w, "invalid JSON", http.StatusBadRequest)
                return
            }
            if err := writeJSONFile(path, obj); err != nil {
                http.Error(w, "failed to write data", http.StatusInternalServerError)
                return
            }
            writeJSONResponse(w, map[string]string{"status": "ok"})

        default:
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        }
    }
}

//
// ────────────────────────────────────────────────────────────────
//  UPLOAD HANDLER (sponsors, backgrounds, logo)
// ────────────────────────────────────────────────────────────────
//

func handleUpload(subdir string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }

        if err := r.ParseMultipartForm(32 << 20); err != nil {
            http.Error(w, "failed to parse form", http.StatusBadRequest)
            return
        }

        file, header, err := r.FormFile("file")
        if err != nil {
            http.Error(w, "missing file", http.StatusBadRequest)
            return
        }
        defer file.Close()

        filename, err := saveUploadedFile(file, header, subdir)
        if err != nil {
            http.Error(w, "failed to save file", http.StatusInternalServerError)
            return
        }

        url := fmt.Sprintf("/images/%s/%s", subdir, filename)
        writeJSONResponse(w, map[string]string{
            "url":      url,
            "filename": filename,
        })
    }
}

func saveUploadedFile(file multipart.File, header *multipart.FileHeader, subdir string) (string, error) {
    base := filepath.Base(header.Filename)
    timestamp := time.Now().UnixNano()
    filename := fmt.Sprintf("%d-%s", timestamp, base)

    targetDir := filepath.Join(imagesDir, subdir)
    if err := os.MkdirAll(targetDir, 0755); err != nil {
        return "", err
    }

    targetPath := filepath.Join(targetDir, filename)
    out, err := os.Create(targetPath)
    if err != nil {
        return "", err
    }
    defer out.Close()

    if _, err := io.Copy(out, file); err != nil {
        return "", err
    }

    return filename, nil
}

//
// ────────────────────────────────────────────────────────────────
//  RESET EVENT (clears teams + results only)
// ────────────────────────────────────────────────────────────────
//

func handleResetEvent(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    if err := writeJSONFile(dataPath("teams.json"), []jsonAny{}); err != nil {
        http.Error(w, "failed to reset teams", http.StatusInternalServerError)
        return
    }
    if err := writeJSONFile(dataPath("results.json"), []jsonAny{}); err != nil {
        http.Error(w, "failed to reset results", http.StatusInternalServerError)
        return
    }

    writeJSONResponse(w, map[string]string{"status": "ok"})
}

//
// ────────────────────────────────────────────────────────────────
//  JSON RESPONSE + BROWSER OPEN
// ────────────────────────────────────────────────────────────────
//

func writeJSONResponse(w http.ResponseWriter, v interface{}) {
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(v); err != nil {
        log.Println("writeJSONResponse error:", err)
    }
}

func openBrowser(url string) {
    var cmd *exec.Cmd

    switch runtime.GOOS {
    case "windows":
        cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
    case "darwin":
        cmd = exec.Command("open", url)
    default:
        cmd = exec.Command("xdg-open", url)
    }

    if err := cmd.Start(); err != nil {
        log.Println("failed to open browser:", err)
    }
}
