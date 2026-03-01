package config

import (
	"crypto/tls"
	"log"
	"net/http"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
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

		log.Println("[DEBUG] ES_ADDRESSES:", c.Elasticsearch.Addresses)
	log.Println("[DEBUG] ES_USER:", c.Elasticsearch.Username)
	log.Println("[DEBUG] ES_PASSWORD length:", c.Elasticsearch.Password)

	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		log.Fatalf("[ES] Error creating client: %s", err)
	}

	// Kiểm tra kết nối
	// Retry connection loop
	var res *esapi.Response
	for i := 0; i < 30; i++ {
		res, err = es.Info()
		if err == nil && !res.IsError() {
			break
		}
		
		log.Printf("[ES] Connection attempt %d/30 failed. Waiting 5s... Error: %v", i+1, err)
		if res != nil {
			log.Printf("[ES] Status: %s", res.Status())
			res.Body.Close()
		}
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		log.Fatalf("[ES] Error getting ES info after retries: %s", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		log.Fatalf("[ES] Elasticsearch returned error status: %s", res.Status())
	} else {
		log.Printf("[ES] Elasticsearch connected successfully! Status: %s", res.Status())
	}

	return es
}
