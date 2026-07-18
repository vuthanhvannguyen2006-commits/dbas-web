type Props = {
    tag: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    link: string;
  };
  
  export default function EventCard({
    tag,
    title,
    date,
    time,
    location,
    image,
    link,
  }: Props) {
    return (
      <a
        href={link || "#"}
        className="events_card"
      >
        <div className="events_card_img_wrap">
          <img src={image} alt={title} className="events_card_img" />
          <span
            className={`events_card_tag events_tag_${tag
              .toLowerCase()
              .replace(/\s+/g, "_")}`}
          >
            {tag}
          </span>
        </div>
        <div className="events_card_body">
          <h3 className="events_card_title">{title}</h3>
          <p className="events_card_date">
            {date} · {time}
          </p>
          <p className="events_card_location">{location}</p>
        </div>
      </a>
    );
  }