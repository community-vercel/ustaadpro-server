# Service Catalog API

## `GET /api/catalog`

The catalog is a three-level hierarchy. A category may omit `subcategories`; in that case clients render `directServices` immediately after the main category.

```json
[
  {
    "id": "electrician",
    "title": "Electrician",
    "mainCategory": {
      "id": "electrician",
      "title": "Electrician",
      "mobileIconUrl": "/uploads/catalog/electrician-icon.png",
      "webImageUrl": "/uploads/catalog/electrician-web.jpg"
    },
    "subcategories": [
      {
        "id": "sub-...",
        "title": "Fan Services",
        "imageUrl": "/uploads/catalog/fan-services.jpg",
        "services": [
          {
            "id": "svc-...",
            "title": "Fan Installation",
            "price": 800,
            "unitDescription": "Per ceiling fan",
            "serviceImageUrl": "https://..."
          }
        ]
      }
    ],
    "directServices": []
  }
]
```

## Asset policy

- `mainCategory.mobileIconUrl`: square mobile-home icon.
- `mainCategory.webImageUrl`: desktop/web hero/card image.
- `subcategory.imageUrl`: sub-service thumbnail.
- `service.serviceImageUrl`: service card/detail image.
- Empty admin image fields never overwrite an existing image. Mobile falls back from subcategory image to its first service image, then to the visual icon.