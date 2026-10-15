package main

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

func main() {
	zipPath := `D:/Cloudreve_Pro_CE/backend/application/statics/assets.zip`
	srcDir := `D:/Cloudreve_Pro_CE/frontend/build`

	outFile, err := os.Create(zipPath)
	if err != nil {
		panic(err)
	}
	defer outFile.Close()

	w := zip.NewWriter(outFile)

	count := 0
	err = filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		zipEntryPath := "assets/build/" + filepath.ToSlash(relPath)

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = zipEntryPath
		header.Method = zip.Deflate

		writer, err := w.CreateHeader(header)
		if err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		if err != nil {
			return err
		}
		count++
		return nil
	})

	if err != nil {
		panic(err)
	}

	if err := w.Close(); err != nil {
		panic(err)
	}

	fmt.Printf("Successfully packed %d files into %s\n", count, zipPath)
}
