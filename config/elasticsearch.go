package config

import (
	"crypto/tls"
	"log"
	"net/http"

	"github.com/elastic/go-elasticsearch/v8"
)

func (c AppConfig) NewESClient() *elasticsearch.Client {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	cfg := elasticsearch.Config{
		Addresses: c.Elasticsearch.Addresses,
		Username:  c.Elasticsearch.Username,
		Password:  c.Elasticsearch.Password,
		Transport: tr, // gán transport vào đây
	}

	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		log.Fatalf("[ES] Error creating client: %s", err)
	}

	// Kiểm tra kết nối
	res, err := es.Info()
	if err != nil {
		log.Fatalf("[ES] Error getting ES info: %s", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		log.Fatalf("[ES] Elasticsearch returned error status: %s", res.Status())
	} else {
		log.Printf("[ES] Elasticsearch connected successfully! Status: %s", res.Status())
	}

	return es
}
