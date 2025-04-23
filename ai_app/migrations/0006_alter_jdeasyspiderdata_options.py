from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('ai_app', '0005_jdbrandtraffic_jdcompetitionanalysis_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='jdeasyspiderdata',
            options={
                'verbose_name': 'Easy京麦采集',
                'verbose_name_plural': 'Easy京麦采集',
                'db_table': 'jd_easy_spider_data',
                'ordering': ['-upload_date'],
            },
        ),
    ] 